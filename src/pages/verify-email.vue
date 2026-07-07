<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, LoaderCircle } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { verifyEmail, resendVerification } from "@/services/auth.service";

type VerifyState = "verifying" | "success" | "error" | "expired" | "missing-token";

const route = useRoute();
const { t } = useI18n();

const state = ref<VerifyState>("verifying");
const resendEmail = ref("");
const isResending = ref(false);

onMounted(async () => {
  const token = route.query.token as string | undefined;
  if (!token) {
    state.value = "missing-token";
    return;
  }
  try {
    await verifyEmail(token);
    state.value = "success";
  } catch (error: any) {
    const tokenError = error?.data?.errors?.token?.[0] as string | undefined;
    state.value = tokenError?.toLowerCase().includes("expired") ? "expired" : "error";
  }
});

async function handleResend() {
  if (!resendEmail.value) return;
  try {
    isResending.value = true;
    await resendVerification(resendEmail.value);
    toast.success(t("auth.verify.resendSuccess"));
  } catch (error: any) {
    if (!error?.data?.errors) {
      toast.error(error?.data?.message || t("auth.verify.resendFailed"));
    }
  } finally {
    isResending.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center space-y-4 text-center">
    <template v-if="state === 'verifying'">
      <LoaderCircle class="h-8 w-8 animate-spin text-primary" />
      <p class="text-sm text-muted-foreground">{{ t("auth.verify.verifying") }}</p>
    </template>

    <template v-else-if="state === 'success'">
      <CheckCircle2 class="h-10 w-10 text-green-600" />
      <p class="text-sm text-muted-foreground">{{ t("auth.verify.success") }}</p>
      <router-link to="/login">
        <Button class="h-12">{{ t("auth.verify.goToLogin") }}</Button>
      </router-link>
    </template>

    <template v-else>
      <XCircle class="h-10 w-10 text-destructive" />
      <p class="text-sm text-muted-foreground">
        {{
          state === "expired"
            ? t("auth.verify.expired")
            : state === "missing-token"
              ? t("auth.verify.missingToken")
              : t("auth.verify.error")
        }}
      </p>
      <div class="w-full max-w-xs space-y-2 text-left">
        <Label for="resend-email">{{ t("auth.email") }}</Label>
        <Input
          id="resend-email"
          v-model="resendEmail"
          type="email"
          autocomplete="email"
          class="h-12 rounded-xl"
        />
        <Button
          class="h-12 w-full"
          :disabled="isResending || !resendEmail"
          @click="handleResend"
        >
          <LoaderCircle v-if="isResending" class="mr-2 h-4 w-4 animate-spin" />
          <span>{{ t("auth.verify.resendButton") }}</span>
        </Button>
      </div>
    </template>
  </div>
</template>
