<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, LockKeyhole, Eye, EyeOff, LoaderCircle } from "lucide-vue-next";
import { toast } from "vue-sonner";

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const email = ref("");
const password = ref("");
const isSubmitting = ref(false);
const showPassword = ref(false);
const isLoading = ref(true);

// Check if the user is already authenticated on component mount
onMounted(() => {
  // Short delay to ensure auth store is initialized
  setTimeout(() => {
    if (authStore.isAuthenticated) {
      console.log("User already authenticated, redirecting to appropriate dashboard");
      redirectToDashboard();
    }
    isLoading.value = false;
  }, 300);
});

// Utility function to redirect based on user role
function redirectToDashboard() {
  const userRole = authStore.user?.user_type;

  switch (userRole) {
    case "superadmin":
      router.replace("/superadmin/home");
      break;
    case "admin":
      router.replace("/admin/home");
      break;
    case "manager":
      router.replace("/manager/home");
      break;
    case "user":
      router.replace("/user/home");
      break;
    default:
      // Stay on login page if role is unknown
      break;
  }
}

async function handleSubmit() {
  if (!email.value || !password.value) {
    toast.error(t("auth.fillAllFields"));
    return;
  }

  try {
    isSubmitting.value = true;

    await authStore.login({
      email: email.value,
      password: password.value,
    });

    // Get the redirect path from query parameters or use role-based default
    const redirectPath = router.currentRoute.value.query.redirect as string;
    if (redirectPath) {
      router.push(redirectPath);
    } else {
      redirectToDashboard();
    }
  } catch (error: any) {
    console.error("Login error:", error);
    if (error?.response?.status === 403 || error?.status === 403) {
      toast.error(error?.data?.message || t("auth.login.unverified"));
    } else {
      toast.error(error.message || t("auth.incorrectCredentials"));
    }
  } finally {
    isSubmitting.value = false;
  }
}

// Quick login functions
async function quickLoginAsSuperadmin() {
  try {
    isSubmitting.value = true;
    await authStore.login({
      email: "superadmin@example.com",
      password: "password123",
    });
    console.log("Superadmin login successful, redirecting to dashboard");
    router.push("/superadmin/home");
  } catch (error: any) {
    console.error("Superadmin login failed:", error);
    toast.error(error.message || t("auth.incorrectCredentials"));
  } finally {
    isSubmitting.value = false;
  }
}

async function quickLoginAsAdmin() {
  try {
    isSubmitting.value = true;
    await authStore.login({
      email: "admin@example.com",
      password: "password123",
    });
    console.log("Admin login successful, redirecting to dashboard");
    router.push("/admin/home");
  } catch (error: any) {
    console.error("Admin login failed:", error);
    toast.error(error.message || t("auth.incorrectCredentials"));
  } finally {
    isSubmitting.value = false;
  }
}

async function quickLoginAsUser() {
  try {
    isSubmitting.value = true;
    await authStore.login({
      email: "user@example.com",
      password: "password123",
    });
    console.log("User login successful, redirecting to home");
    router.push("/user/home");
  } catch (error: any) {
    console.error("User login failed:", error);
    toast.error(error.message || t("auth.incorrectCredentials"));
  } finally {
    isSubmitting.value = false;
  }
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}
</script>

<template>
  <div v-if="isLoading" class="flex h-64 items-center justify-center">
    <LoaderCircle class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else>
    <div class="mb-8 flex flex-col space-y-2">
      <h1 class="type-page-title text-foreground">
        {{ t("auth.login.title") }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t("auth.login.subtitle") }}
      </p>
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <Label for="email">{{ t("auth.email") }}</Label>
        <div class="relative">
          <Mail
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('auth.login.emailPlaceholder')"
            required
            autocomplete="email"
            class="h-12 rounded-xl pl-10"
          />
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label for="password">{{ t("auth.password") }}</Label>
          <router-link
            to="/forgot-password"
            class="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {{ t("auth.forgotPassword") }}
          </router-link>
        </div>
        <div class="relative">
          <LockKeyhole
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="t('auth.login.passwordPlaceholder')"
            required
            autocomplete="current-password"
            class="h-12 rounded-xl pl-10 pr-10"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
            :aria-label="showPassword ? t('common.close') : t('common.open')"
            @click="togglePasswordVisibility"
          >
            <EyeOff v-if="showPassword" class="h-4 w-4" />
            <Eye v-else class="h-4 w-4" />
          </button>
        </div>
      </div>

      <Button type="submit" class="h-12 w-full" :disabled="isSubmitting">
        <LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
        <span>{{ isSubmitting ? t("auth.login.signingIn") : t("auth.signIn") }}</span>
      </Button>
    </form>

    <!-- Quick Login Buttons -->
    <div class="mt-6 space-y-3">
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t border-border"></span>
        </div>
        <div class="relative flex justify-center text-xs">
          <span class="bg-background px-2 text-muted-foreground">
            {{ t("auth.login.quickLogin") }}
          </span>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          size="sm"
          :disabled="isSubmitting"
          @click="quickLoginAsSuperadmin"
        >
          {{ t("auth.login.roleSuperadmin") }}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          :disabled="isSubmitting"
          @click="quickLoginAsAdmin"
        >
          {{ t("auth.login.roleAdmin") }}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          :disabled="isSubmitting"
          @click="quickLoginAsUser"
        >
          {{ t("auth.login.roleUser") }}
        </Button>
      </div>
      <p class="text-center text-xs text-muted-foreground">
        {{ t("auth.login.quickLoginHint") }}
      </p>
    </div>

    <p class="mt-6 text-center text-sm text-muted-foreground">
      {{ t("auth.login.noAccount") }}
      <router-link
        to="/register"
        class="font-medium text-primary underline-offset-4 hover:underline"
      >
        {{ t("auth.signUp") }}
      </router-link>
    </p>
  </div>
</template>
