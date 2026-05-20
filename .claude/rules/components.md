---
name: vue-component-rules
description: Conventions for Vue 3 component authoring in this codebase. Loads when editing .vue files.
applyTo:
  - "src/components/**/*.vue"
  - "src/pages/**/*.vue"
  - "src/layouts/**/*.vue"
---

# Vue 3 Component Rules

## Always
- **`<script setup lang="ts">`** for every new component. No Options API. No `defineComponent({ ... })` boilerplate.
- **Typed `defineProps` / `defineEmits`** using TypeScript generics: `defineProps<{ id: string; open?: boolean }>()`.
- **Use existing Shadcn primitives** from `src/components/ui/`. Don't import raw `radix-vue` / `reka-ui` outside that folder.
- **All user-visible strings via `vue-i18n`**: `{{ t('namespace.key') }}` in templates, `useI18n()` in script. Add the key to EVERY file in `src/locales/`.
- **Tailwind classes only.** No new `<style>` blocks unless dynamic/scoped is truly required.
- **Path alias `@/`** for any non-relative import (`import { X } from '@/composables/useX'`).

## Never
- **Never call `ofetch` directly from a `.vue` file.** Go through `src/services/` or a composable.
- **Never mutate Pinia store state from outside the store.** Define an action.
- **Never hardcode an English string** in markup or template attributes (alt, aria-label, title, placeholder all count).
- **Never duplicate store state into a local `ref`.** Read from the store via `storeToRefs` if you need reactivity preserved on destructure.

## Smell checks before committing a component
- Is every string i18n-wrapped?
- Does it have a single responsibility, or is it doing UI + data-fetching + business logic?
- Are props minimally typed and required where they should be?
- Are emits declared (typed) for every `emit('event-name', ...)` call?
