/**
 * Auth API client — wraps the BE's /auth/register, /auth/verify-email, and
 * /auth/resend-verification endpoints. login()/logout()/fetchUserData() stay
 * in the auth store (they need direct ofetch access to avoid the 401-retry
 * wrapper interfering with the login attempt itself); these three don't.
 *
 * Every call goes through unwrap() so a failed request throws.
 */
import { apiPost, unwrap } from "@/services/api";
import type {
  RegisterCredentials,
  RegisterResponse,
  VerifyEmailResponse,
} from "@/types/auth";

/** POST /auth/register */
export async function registerUser(
  input: RegisterCredentials,
): Promise<RegisterResponse> {
  return unwrap(await apiPost<RegisterResponse>("/auth/register", input));
}

/** POST /auth/verify-email */
export async function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  return unwrap(await apiPost<VerifyEmailResponse>("/auth/verify-email", { token }));
}

/** POST /auth/resend-verification */
export async function resendVerification(email: string): Promise<{ message: string }> {
  return unwrap(
    await apiPost<{ message: string }>("/auth/resend-verification", { email }),
  );
}
