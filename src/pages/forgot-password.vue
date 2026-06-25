<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, LoaderCircle } from "lucide-vue-next";
import { toast } from "vue-sonner";

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const email = ref("");
const isSubmitting = ref(false);

async function handleSubmit() {
  if (!email.value) {
    toast.error(t("auth.forgot.enterEmail"));
    return;
  }

  try {
    isSubmitting.value = true;
    // TODO: Implement forgot password logic
    toast.success(t("auth.forgot.resetSent"));
    router.push("/login");
  } catch (error: any) {
    console.log("error: ", error);
    toast.error(error.data?.message || t("errors.somethingWentWrong"));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div>
    <div class="mb-8 flex flex-col space-y-2">
      <h1 class="type-page-title text-foreground">
        {{ t("auth.forgot.title") }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t("auth.forgot.subtitle") }}
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
            :placeholder="t('auth.forgot.emailPlaceholder')"
            required
            autocomplete="email"
            class="h-12 rounded-xl pl-10"
          />
        </div>
      </div>

      <Button type="submit" class="h-12 w-full" :disabled="isSubmitting">
        <LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
        <span>{{
          isSubmitting ? t("auth.forgot.sending") : t("auth.forgot.sendInstructions")
        }}</span>
      </Button>
    </form>

    <p class="mt-6 text-center text-sm text-muted-foreground">
      {{ t("auth.forgot.rememberPassword") }}
      <router-link
        to="/login"
        class="font-medium text-primary underline-offset-4 hover:underline"
      >
        {{ t("auth.signIn") }}
      </router-link>
    </p>
  </div>
</template>
