/**
 * App boot sequence.
 *
 * runBoot() performs one-time startup work — currently restoring the auth
 * session. It's called from two places:
 *   - main.ts, before app.mount(): kicking it off here means the auth
 *     store's *synchronous* localStorage restore runs before the router
 *     resolves its first route, so guards see the correct auth state and
 *     there's no login-page flash for an already-logged-in user.
 *   - App.vue: awaits the same (cached) promise to drive the loading
 *     screen — the screen lifts once the async token validation finishes.
 */
import { useAuthStore } from "@/stores/auth";

let bootPromise: Promise<void> | null = null;

/** Run boot once; repeat calls return the same promise. */
export function runBoot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = useAuthStore().init();
  }
  return bootPromise;
}
