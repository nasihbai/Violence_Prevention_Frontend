<script setup lang="ts">
import { computed } from "vue";
import { useColorMode } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Sun, Moon } from "lucide-vue-next";

const mode = useColorMode();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

function toggleMode() {
  mode.value = mode.value === "dark" ? "light" : "dark";
}

function navigateTo(path: string) {
  router.push(path);
}

// Artwork copy varies by the auth route (login / signup / forgot).
const artwork = computed(() => {
  const path = route.path;
  if (path.startsWith("/register")) {
    return {
      title: t("auth.artwork.signupTitle"),
      description: t("auth.artwork.signupDescription"),
    };
  }
  if (path.startsWith("/forgot-password")) {
    return {
      title: t("auth.artwork.forgotTitle"),
      description: t("auth.artwork.forgotDescription"),
    };
  }
  return {
    title: t("auth.artwork.loginTitle"),
    description: t("auth.artwork.loginDescription"),
  };
});
</script>

<template>
  <div class="min-h-svh bg-background text-foreground">
    <div class="grid min-h-svh lg:grid-cols-2">
      <!-- Theme Toggle -->
      <button
        class="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground backdrop-blur-md transition hover:text-foreground"
        :aria-label="mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleMode"
      >
        <Sun v-if="mode === 'dark'" class="h-5 w-5" />
        <Moon v-else class="h-5 w-5" />
      </button>

      <!-- Left: Artwork panel -->
      <div class="relative hidden overflow-hidden bg-[#07090d] lg:block">
        <img
          src="@/assets/login.jpg"
          alt=""
          class="absolute inset-0 h-full w-full object-cover object-center opacity-80"
        />
        <!-- Planix overlay gradients -->
        <div
          class="absolute inset-0"
          style="
            background:
              linear-gradient(180deg, rgba(229,143,101,0.14) 0%, rgba(11,20,22,0.22) 32%, rgba(4,7,8,0.62) 100%),
              radial-gradient(circle at 18% 18%, rgba(251,138,116,0.18), transparent 34%),
              radial-gradient(circle at 82% 80%, rgba(67,164,160,0.12), transparent 38%);
          "
        />
        <div
          class="absolute inset-0"
          style="
            background: radial-gradient(circle at center, transparent 32%, rgba(3,5,8,0.2) 68%, rgba(3,5,8,0.4) 100%);
          "
        />

        <!-- Brand mark top-left -->
        <!-- <div class="relative z-10 flex items-center gap-3 p-8">
          <img
            src="@/assets/logo.png"
            alt="logo"
            class="h-12 w-auto rounded-lg drop-shadow-md"
          />
        </div> -->

        <!-- Copy card bottom -->
        <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-start p-8 xl:p-12">
          <div
            class="max-w-[26rem] rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(11,14,18,0.32),rgba(11,14,18,0.6))] px-6 py-5 text-left shadow-2xl backdrop-blur-md"
          >
            <p class="type-card-title text-balance text-white">
              {{ artwork.title }}
            </p>
            <p class="mt-3 max-w-[22rem] text-sm leading-6 text-white/70">
              {{ artwork.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Right: Auth content -->
      <div class="relative flex w-full flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div class="mx-auto flex w-full max-w-[420px] flex-col">
          <!-- Brand header -->
          <div class="mb-8 flex items-center gap-3">
            <img
              src="@/assets/logo.png"
              alt="logo"
              class="h-11 w-auto rounded-lg"
            />
            <span class="type-card-title font-semibold text-foreground">
              {{ t("auth.brandName") }}
            </span>
          </div>

          <slot />

          <!-- Footer links -->
          <div class="mt-10 text-center text-sm text-muted-foreground">
            <div class="flex justify-center gap-4">
              <button
                class="transition-colors hover:text-primary"
                @click="navigateTo('/about')"
              >
                {{ t("auth.footer.aboutUs") }}
              </button>
              <span class="text-muted-foreground/40">|</span>
              <button
                class="transition-colors hover:text-primary"
                @click="navigateTo('/privacy-policy')"
              >
                {{ t("auth.footer.privacy") }}
              </button>
              <span class="text-muted-foreground/40">|</span>
              <button
                class="transition-colors hover:text-primary"
                @click="navigateTo('/terms-of-service')"
              >
                {{ t("auth.footer.terms") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
