<script setup lang="ts">
import { useNavigationStore } from "@/stores/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronRight } from "lucide-vue-next";
import NavUser from "@/layouts/components/NavUser.vue";
import DashboardHeader from "@/layouts/components/DashboardHeader.vue";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog.vue";
import ImpersonationBanner from "@/components/ImpersonationBanner.vue";

const navigationStore = useNavigationStore();
const route = useRoute();
const router = useRouter();
const showKeyboardShortcuts = ref(false);

// Use navigation from the store
const navigation = computed(() => navigationStore.navigation);

// Route-based active state — a route is active if it matches exactly or is a
// child of the item's url. Drives the Planix coral active pill.
function isActive(url: string) {
  return route.path === url || route.path.startsWith(url + "/");
}

// A collapsible parent is open when any of its children is the active route.
function isParentActive(items?: { url: string }[]) {
  return Boolean(items?.some((item) => isActive(item.url)));
}

// Initialize theme settings on mount
onMounted(() => {
  // Apply saved color scheme
  const savedColorScheme = localStorage.getItem("theme-color") || "planix";
  document.documentElement.setAttribute("data-color-scheme", savedColorScheme);

  // Apply saved radius
  const savedRadius = localStorage.getItem("theme-radius") || "0.5";
  document.documentElement.style.setProperty("--radius", `${savedRadius}rem`);
});

// Keyboard shortcut handler
function handleKeyDown(e: KeyboardEvent) {
  const isCmdOrCtrl = e.metaKey || e.ctrlKey;

  if (isCmdOrCtrl && e.key === "k") {
    e.preventDefault();
    showKeyboardShortcuts.value = true;
  } else if (isCmdOrCtrl && e.key === "s") {
    e.preventDefault();
    router.push("/setting");
  } else if (e.shiftKey && e.key === "P") {
    e.preventDefault();
    router.push("/profile");
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader>
        <div class="flex items-center justify-center gap-2 py-4">
          <img
            src="@/assets/logo.png"
            alt="logo"
            class="h-12 w-auto rounded-lg drop-shadow-md"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup v-for="group in navigation" :key="group.title">
          <SidebarGroupLabel
            class="type-caption uppercase tracking-wider text-muted-foreground"
          >
            {{ group.title }}
          </SidebarGroupLabel>
          <SidebarMenu v-for="item in group.menu" :key="item.title">
            <Collapsible
              v-if="item.items"
              as-child
              :default-open="isParentActive(item.items)"
              class="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger as-child>
                  <SidebarMenuButton
                    :tooltip="item.title"
                    :is-active="isParentActive(item.items)"
                    class="rounded-lg transition-all data-[active=true]:bg-primary/15 data-[active=true]:font-medium data-[active=true]:text-primary"
                  >
                    <component :is="item.icon" v-if="item.icon" />
                    <span>{{ item.title }}</span>
                    <ChevronRight
                      class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem
                      v-for="subItem in item.items"
                      :key="subItem.title"
                    >
                      <SidebarMenuSubButton
                        as-child
                        :is-active="isActive(subItem.url)"
                        class="data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                      >
                        <a :href="subItem.url">
                          <span>{{ subItem.title }}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
            <SidebarMenuItem v-else>
              <SidebarMenuButton
                :tooltip="item.title"
                :is-active="isActive(item.url)"
                class="rounded-lg transition-all data-[active=true]:bg-primary/15 data-[active=true]:font-medium data-[active=true]:text-primary"
                @click="router.push(item.url)"
              >
                <component :is="item.icon" v-if="item.icon" />
                <span>{{ item.title }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div class="flex w-full flex-col items-center gap-2">
          <NavUser />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>

    <SidebarInset>
      <div class="flex flex-1 flex-col">
        <ImpersonationBanner />
        <DashboardHeader />

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto bg-app-gradient">
          <div class="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6">
            <div :key="route.path" class="panel-pop-in">
              <slot />
            </div>
          </div>
        </main>
      </div>
    </SidebarInset>
  </SidebarProvider>

  <!-- Keyboard Shortcuts Dialog -->
  <KeyboardShortcutsDialog v-model:open="showKeyboardShortcuts" />
</template>
