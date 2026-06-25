<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    :class="
      cn(
        '-mx-6 -mb-6 mt-2 flex flex-col-reverse gap-2 border-t border-border px-6 pb-5 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-x-2',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
