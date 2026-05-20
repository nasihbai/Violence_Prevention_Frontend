---
name: stores-services-rules
description: Conventions for Pinia stores and service-layer HTTP clients. Loads when editing src/stores/ or src/services/.
applyTo:
  - "src/stores/**/*.ts"
  - "src/services/**/*.ts"
  - "src/composables/**/*.ts"
---

# Stores, Services, Composables

## Pinia stores (`src/stores/`)
- Use the **setup-style syntax**: `defineStore('id', () => { ... return { state, actions } })`.
- All mutations happen via actions defined inside the store — no external mutation.
- Use `ref` for primitives, `reactive` only when needed for nested objects, `computed` for derived state.
- Store IDs are unique kebab-case strings matching the filename (`user-store.ts` → `'user-store'`).

## Services (`src/services/`)
- One file per backend resource: `auth.service.ts`, `alerts.service.ts`, etc.
- Export named functions, not classes. `export async function getAlerts(...)`.
- All HTTP calls use `ofetch`. Set base URL via the central client config — don't hardcode hosts.
- Always type the response: `ofetch<AlertResponse>(...)`. No `any` return types.
- Network errors are rethrown — let the caller (composable or store) decide UI behavior.
- This frontend talks to TWO backends: the small in-repo Hono backend (users/sessions/alerts) AND the Python ML backend (`../FYP_Violence_Prevention_backend`, HTTP-only). Name services by which one they hit.

## Composables (`src/composables/`)
- `use*` naming. One concern per composable.
- Composables that touch services should expose loading/error state, not just data.
- Reusable across components; not coupled to a specific component's lifecycle outside `onMounted` / `onUnmounted`.

## Anti-patterns
- ❌ Calling `ofetch` directly from a `.vue` file.
- ❌ Mutating `store.someValue = x` from outside the store.
- ❌ Stuffing all logic into a single mega-store. Split by domain.
- ❌ Composables that return a single non-reactive value (just use a function).
