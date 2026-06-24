<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Bell, Shield as ShieldIcon } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigationStore } from "@/stores/navigation";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from "@/stores/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const navigationStore = useNavigationStore();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

// Derive the current section title from the active nav item (no route meta
// exists). Flatten groups + submenus, pick the longest matching url so a
// submenu route wins over its parent. Falls back to a generic i18n label.
const sectionTitle = computed(() => {
  const path = route.path;
  let best: { title: string; url: string } | null = null;

  for (const group of navigationStore.navigation) {
    for (const item of group.menu) {
      const candidates = [item, ...(item.items ?? [])];
      for (const candidate of candidates) {
        const matches =
          path === candidate.url || path.startsWith(candidate.url + "/");
        if (matches && (!best || candidate.url.length > best.url.length)) {
          best = { title: candidate.title, url: candidate.url };
        }
      }
    }
  }

  return best?.title ?? t("dashboard.header.sectionFallback");
});

const isSuperAdmin = computed(
  () => authStore.user?.user_type === "superadmin",
);

// Format a timestamp as a short "time ago" label.
function formatTimeAgo(timestamp: string | number | Date) {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
</script>

<template>
  <header
    class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6"
  >
    <!-- Section title -->
    <h1 class="type-section-title truncate font-semibold text-foreground">
      {{ sectionTitle }}
    </h1>

    <div class="flex items-center gap-2">
      <!-- SuperAdmin quick access -->
      <Button
        v-if="isSuperAdmin"
        size="sm"
        variant="secondary"
        class="gap-2"
        @click="router.push('/superadmin/home')"
      >
        <ShieldIcon class="h-4 w-4 text-primary" />
        <span class="hidden sm:inline">{{ t("dashboard.header.superAdmin") }}</span>
      </Button>

      <!-- Language switcher -->
      <LanguageSwitcher />

      <!-- Notifications -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="icon" variant="ghost" class="relative">
            <Bell class="h-4 w-4" />
            <span
              v-if="notificationStore.unreadCount > 0"
              class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
            >
              {{ notificationStore.unreadCount }}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-80 p-0">
          <div class="border-b border-border p-3">
            <div class="type-label font-semibold text-foreground">
              {{ t("notifications.title") }}
            </div>
            <div class="type-caption text-muted-foreground">
              {{ t("notifications.unreadCount", { count: notificationStore.unreadCount }) }}
            </div>
          </div>

          <div class="max-h-96 overflow-y-auto">
            <div
              v-if="notificationStore.notifications.length === 0"
              class="py-6 text-center"
            >
              <div
                class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted"
              >
                <Bell class="h-5 w-5 text-muted-foreground" />
              </div>
              <div class="text-sm font-medium text-foreground">
                {{ t("notifications.empty") }}
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                {{ t("notifications.emptyHint") }}
              </div>
            </div>

            <div
              v-for="notification in notificationStore.notifications"
              :key="notification.id"
              class="cursor-pointer border-b border-border p-3 transition-colors hover:bg-muted/50"
              @click="notificationStore.markAsRead(notification.id)"
            >
              <div class="flex items-start gap-3">
                <div
                  class="rounded-full p-1.5"
                  :class="{
                    'bg-primary/15': notification.type === 'info',
                    'bg-warning/15': notification.type === 'warning',
                    'bg-success/15': notification.type === 'success',
                    'bg-destructive/15': notification.type === 'error',
                  }"
                >
                  <Bell
                    class="h-4 w-4"
                    :class="{
                      'text-primary': notification.type === 'info',
                      'text-warning': notification.type === 'warning',
                      'text-success': notification.type === 'success',
                      'text-destructive': notification.type === 'error',
                    }"
                  />
                </div>
                <div class="flex-1 space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-sm font-medium text-foreground">
                      {{ notification.title }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ formatTimeAgo(notification.timestamp) }}
                    </div>
                  </div>
                  <div class="text-sm text-muted-foreground">
                    {{ notification.message }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-border p-3">
            <div class="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                @click="router.push('/notifications')"
              >
                {{ t("notifications.viewAll") }}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                :disabled="notificationStore.unreadCount === 0"
                @click="notificationStore.markAllAsRead()"
              >
                {{ t("notifications.markAllRead") }}
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
