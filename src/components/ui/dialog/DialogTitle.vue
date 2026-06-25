<script setup lang="ts">
import { cn } from '@/lib/utils'
import { DialogTitle, type DialogTitleProps, useForwardProps } from 'reka-ui'
import { type HTMLAttributes } from 'vue'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()

const forwardedProps = useForwardProps(props)
</script>

<template>
  <DialogTitle
    v-bind="forwardedProps"
    :class="
      cn(
        'type-card-title text-foreground',
        props.class,
      )
    "
  >
    <slot />
  </DialogTitle>
</template>
