import { defineStore } from "pinia";
import { ref, computed, markRaw } from "vue";
import { useRouter, Router } from "vue-router";
import { ofetch } from "ofetch";
import {
  type User,
  type LoginCredentials,
  type SSOCredentials,
  type UserRole
} from "@/types/auth";
import { apiPost } from "@/services/api";

const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl;
  if (typeof window !== "undefined" && window.API_URL) return window.API_URL;
  return "http://localhost:5000";
};

/**
 * Dev-only offline auth mock. Enabled by setting VITE_MOCK_AUTH=true in
 * .env.local (gitignored). When on, login() and fetchUserData() short-circuit
 * with a fake session instead of calling the Python backend — lets you preview
 * authenticated pages (e.g. the dashboard navbar) without running the backend.
 * Leave it unset/false for any real build.
 */
const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === "true";

/** Build a fake user for the offline mock, deriving the role from the email. */
const buildMockUser = (email: string): User => {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const user_type: UserRole = local.includes("superadmin")
    ? "superadmin"
    : local.includes("admin")
      ? "admin"
      : "user";
  return {
    id: "mock-1",
    email,
    fullname: `Mock ${user_type}`,
    user_type,
    avatar: "/avatars/shadcn.jpg",
  };
};

/**
 * Authentication store that manages user authentication state
 * Uses HTTP-only cookies for refresh tokens and localStorage for access tokens
 * Implements CSRF protection and a role-based access system
 */
export const useAuthStore = defineStore("auth", () => {
  // Initialize router safely, but don't mark it as raw yet since it might not be available
  let router: Router | null = null;
  try {
    const routerInstance = useRouter();
    // Only mark as raw if it's a valid object
    if (routerInstance && typeof routerInstance === 'object') {
      router = markRaw(routerInstance);
    }
  } catch (error) {
    console.warn("Router not available when initializing auth store");
    router = null;
  }

  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const csrfToken = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const roles = ref<string[]>([]);

  // Impersonation state
  const impersonating = ref(false);
  const originalUser = ref<User | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);
  
  // Get router instance safely
  const getRouter = (): Router | null => {
    // If router wasn't available during store initialization, try to get it now
    if (!router) {
      try {
        const routerInstance = useRouter();
        router = markRaw(routerInstance);
      } catch (error) {
        console.warn("Router still not available");
      }
    }
    return router;
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: UserRole): boolean => {
    return user.value?.user_type === role;
  };

  /**
   * Check if user has permission to access a resource
   */
  const hasPermission = (permission: string): boolean => {
    // This is a simple implementation. In a real app, you would have
    // a more robust permission system with role-based permissions
    const rolePermissions: Record<UserRole, string[]> = {
      superadmin: ['all', 'user:read', 'user:write', 'user:delete', 'settings:read', 'settings:write', 'system:read', 'system:write'],
      admin: ['user:read', 'user:write', 'settings:read', 'settings:write'],
      manager: ['user:read', 'user:write', 'team:read', 'team:write', 'project:read', 'project:write'],
      user: ['user:read']
    };
    
    // Superadmin has all permissions
    if (user.value?.user_type === 'superadmin') {
      return true;
    }
    
    // Check if user's role has the requested permission
    return user.value ? rolePermissions[user.value.user_type].includes(permission) : false;
  };

  /**
   * CSRF token fetcher.
   *
   * Disabled: the Python backend does not implement CSRF token issuance
   * (deferred to Phase 6 / hardening). Returns an empty string so existing
   * callers continue to work without crashing. The api.ts header builder
   * skips the X-CSRF-TOKEN header when the value is empty/missing.
   */
  const fetchCSRFToken = async (): Promise<string> => {
    return "";
  };

  /**
   * Initialize the auth store on app boot. Restores from localStorage and
   * validates the saved token by hitting /auth/me. Falls back to a clean
   * logout if the token is rejected.
   */
  const init = async (): Promise<void> => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser);
      } catch {
        // Corrupt entry; clear it
        localStorage.removeItem("user");
      }
    }

    const storedAccessToken = localStorage.getItem("access_token");
    if (storedAccessToken) {
      accessToken.value = storedAccessToken;
    }

    // Validate the token against /auth/me — refreshes the user shape too
    if (accessToken.value) {
      try {
        await fetchUserData();
      } catch {
        clearAuthData();
      }
    }

    // Impersonation state (kept for FE features; unrelated to BE auth)
    const isImpersonating = localStorage.getItem("impersonating") === "true";
    const storedOriginalUser = localStorage.getItem("original_user");

    if (isImpersonating && storedOriginalUser) {
      impersonating.value = true;
      try {
        originalUser.value = JSON.parse(storedOriginalUser);
      } catch {
        localStorage.removeItem("original_user");
        localStorage.removeItem("impersonating");
        impersonating.value = false;
      }
    }
  };

  /**
   * Fetch the current user's data from the server
   */
  const fetchUserData = async (): Promise<void> => {
    // Offline dev mock: trust the user already restored from localStorage,
    // so a page reload doesn't try to validate against an absent backend.
    if (MOCK_AUTH) {
      return;
    }

    try {
      const { data } = await apiPost<User>("/auth/me", {});
      user.value = data;
      localStorage.setItem("user", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      throw error;
    }
  };

  /**
   * Clear all authentication data
   */
  const clearAuthData = (): void => {
    user.value = null;
    accessToken.value = null;
    csrfToken.value = null;
    roles.value = [];
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("csrf_token");
  };

  /**
   * Login with email and password. Calls POST /auth/login on the Python BE.
   *
   * BE response shape: { access_token: string, user: { id, fullname, email, user_type, avatar } }
   * Uses ofetch directly (not the apiPost wrapper) so the wrapper's 401-retry
   * logic doesn't try to refresh-then-logout when the failure IS the login attempt.
   */
  async function login(credentials: LoginCredentials): Promise<void> {
    isLoading.value = true;
    error.value = null;

    // Offline dev mock: accept any credentials, set a fake session.
    if (MOCK_AUTH) {
      const mockUser = buildMockUser(credentials.email);
      accessToken.value = "mock-token";
      user.value = mockUser;
      localStorage.setItem("access_token", "mock-token");
      localStorage.setItem("user", JSON.stringify(mockUser));
      isLoading.value = false;
      return;
    }

    try {
      const response = await ofetch<{ access_token: string; user: User }>(
        `${getApiUrl()}/auth/login`,
        {
          method: "POST",
          body: { email: credentials.email, password: credentials.password },
        }
      );

      if (!response?.access_token || !response?.user) {
        throw new Error("Server returned no access token");
      }

      accessToken.value = response.access_token;
      user.value = response.user;

      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("user", JSON.stringify(response.user));
    } catch (e: any) {
      console.error("Login error:", e);
      const beMsg = e?.data?.errors?._?.[0] || e?.data?.message || e?.data?.msg;
      error.value = beMsg || e?.message || "Login failed";
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * SSO login.
   *
   * Disabled: the Python backend does not implement /auth/sso/* endpoints
   * (deferred to Phase 6 / hardening). Throws so calling UI shows a clear
   * error instead of silently failing.
   */
  async function loginWithSSO(_credentials: SSOCredentials): Promise<void> {
    const msg = "SSO login is not enabled in this build.";
    error.value = msg;
    throw new Error(msg);
  }

  /**
   * Refresh access token.
   *
   * Disabled: the backend does not implement /auth/refresh-token yet
   * (single long-lived JWT is acceptable for demo per the wiring plan).
   * Returns null so the 401-retry path in services/api.ts falls through
   * to logout, which is the right behavior for an expired token.
   */
  async function refreshAccessToken(): Promise<string | null> {
    return null;
  }

  /**
   * Logout. Fire-and-forget POST /auth/logout, then drop local auth state
   * and redirect to the login page regardless of whether the server call
   * succeeded — local state is the source of truth for "logged out".
   */
  async function logout(): Promise<void> {
    if (accessToken.value) {
      try {
        await ofetch(`${getApiUrl()}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken.value}` },
          timeout: 2000,
        });
      } catch (e) {
        console.warn("Logout API call failed (continuing with local logout):", e);
      }
    }

    clearAuthData();

    const routerInstance = getRouter();
    if (routerInstance) {
      routerInstance.push("/login");
    }
  }

  /**
   * Start impersonating a user
   */
  async function impersonateUser(targetUser: User): Promise<void> {
    if (!user.value) {
      throw new Error("Cannot impersonate: No authenticated user");
    }
    
    if (!hasPermission('user:impersonate')) {
      throw new Error("You don't have permission to impersonate users");
    }
    
    try {
      // Store the original user
      originalUser.value = { ...user.value };
      
      // Set impersonation flag
      impersonating.value = true;
      
      // Replace current user with target user
      user.value = targetUser;
      
      // Store the impersonation state
      localStorage.setItem("impersonating", "true");
      localStorage.setItem("original_user", JSON.stringify(originalUser.value));
      
      // In a real app, you would make an API call to start impersonation
      // and the backend would issue a special token
      
      // For our boilerplate, we'll just store the impersonated user
      localStorage.setItem("user", JSON.stringify(user.value));
      
      console.log(`Now impersonating user: ${targetUser.email}`);
    } catch (error) {
      console.error("Failed to impersonate user:", error);
      throw error;
    }
  }
  
  /**
   * Stop impersonating and return to original user
   */
  async function stopImpersonating(): Promise<void> {
    if (!impersonating.value || !originalUser.value) {
      return;
    }
    
    try {
      // Restore original user
      user.value = originalUser.value;
      
      // Reset impersonation state
      impersonating.value = false;
      originalUser.value = null;
      
      // Clean up localStorage
      localStorage.removeItem("impersonating");
      localStorage.removeItem("original_user");
      localStorage.setItem("user", JSON.stringify(user.value));
      
      // In a real app, you would make an API call to end impersonation
      
      console.log("Stopped impersonating, returned to original user");
    } catch (error) {
      console.error("Failed to stop impersonating:", error);
      throw error;
    }
  }

  return {
    user,
    accessToken,
    csrfToken,
    isLoading,
    error,
    roles,
    isAuthenticated,
    hasRole,
    hasPermission,
    login,
    loginWithSSO,
    logout,
    init,
    refreshAccessToken,
    fetchUserData,
    
    // Impersonation
    impersonating: computed(() => impersonating.value),
    originalUser: computed(() => originalUser.value),
    impersonateUser,
    stopImpersonating
  };
});
