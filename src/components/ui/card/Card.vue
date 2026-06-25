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
        'panel-surface rounded-xl text-card-foreground',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
