<template>
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div class="flex flex-col items-center gap-4 text-center">
      <!-- Logo -->
      <img
        :src="logoUrl"
        alt="SOTERIA"
        class="h-12 w-auto mb-2 object-contain"
      />

      <!-- Loading Spinner -->
      <div class="relative">
        <div
          class="w-12 h-12 border-4 rounded-full animate-spin"
          :style="{
            borderColor: `${primaryColor}33`,
            borderTopColor: primaryColor,
          }"
        ></div>
      </div>

      <!-- Loading Text -->
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-foreground">
          {{ title }}
        </h3>
        <p class="text-sm text-muted-foreground max-w-sm">
          {{ description }}
        </p>
      </div>

      <!-- Progress Dots -->
      <div class="flex gap-1">
        <div
          v-for="i in 3"
          :key="i"
          class="w-2 h-2 rounded-full animate-pulse"
          :style="{ backgroundColor: primaryColor, animationDelay: `${(i - 1) * 0.2}s` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '@/stores/config';
import logoUrl from '@/assets/logo.png';

interface LoadingPageProps {
  title?: string;
  description?: string;
}

const props = withDefaults(defineProps<LoadingPageProps>(), {
  title: 'Loading...',
  description: 'Please wait while we prepare everything for you.',
});

const configStore = useConfigStore();
const primaryColor = computed(() => configStore.getTheme.primaryColor || '#0ea5e9');
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
