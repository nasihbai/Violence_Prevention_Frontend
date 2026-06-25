<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    :class="
      cn(
        '-mx-6 -mt-6 mb-2 flex flex-col gap-y-1.5 border-b border-border px-6 pb-4 pt-5 text-center sm:text-left',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
