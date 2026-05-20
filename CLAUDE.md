# Global Claude Behavior Rules

## Verify-After-Complete (MANDATORY)

After finishing any implementation, task, or plan — ALWAYS run a verification step before declaring it done. This is non-negotiable.

### What to verify depends on what was built:

| Work Type | Verification Steps |
|-----------|-------------------|
| Code / feature | Run tests, run type check, run build |
| API / server route | curl or fetch the live endpoint, check the response is real data |
| Deployment | Hit the production URL, confirm it's not the fallback/empty state |
| Config change | Confirm the config was actually picked up (e.g. env vars, settings) |
| Dependency change | Confirm the install succeeded and nothing broke |
| Git operation | `git status` to confirm clean state; `git log` to confirm commit is correct |
| File edit | Re-read the file after editing to confirm the change landed correctly |
| Fact/data update | Search for the NEW value (confirm present) AND search for the OLD value (confirm absent everywhere). Stale copies in other locations are the #1 missed verification. |

### Verification mindset
- **Don't assume it worked** — run the check. A passing build does not mean correct behavior.
- **Check the actual output**, not just exit codes. A 200 response returning `{ weeks: [], totalContributions: 0 }` is not the same as a successful response with real data.
- **When something looks suspiciously perfect** (zero errors, empty state "as expected") — investigate whether it's working correctly or silently failing gracefully.
- **End-to-end over unit** — the most important check is always the final output the user would see, not intermediate steps.
- **Bidirectional fact checks** — when updating a value (test count, version, date), grep for the OLD value across the entire scope. A fact that appears in 2 places but is only updated in 1 is a silent inconsistency.

### After verification
- If something is wrong → fix it immediately, then re-verify.
- If everything passes → explicitly state what was verified and the results.
- Never say "done" without having verified the result.
- **Return to plan after interruptions** — after completing any side-task, user interruption, or context switch, check your todo list and resume the in-progress plan item. Plans get abandoned not because they're lost, but because attention drifts. This one habit prevents the most common execution gap.
- **Finish the current task before expanding scope** — when implementing a fix, adjacent issues will surface (stale comments, inconsistent patterns, missing tests). Note them for later but do not detour into them mid-task. Scope creep is how simple tasks become 15-file changes.
- **Intentional reads over exhaustive reads** — before reading a file, decide: exploring (full read) or verifying (targeted read with offset/limit). First-time reads should be full to build understanding. Re-reads for verification should be targeted. Delegate heavy multi-file exploration to subagents to keep the main context lean.

## Diagnose-First Rule (Before Any Fix)

Before investigating any error or writing any fix plan, always run these four checks first:

### 1. Check git state
```bash
git status        # are files missing due to unstaged deletions?
git log --oneline -5  # was this already fixed in a recent commit?
```
A "missing file" finding is meaningless without first confirming it isn't just an unstaged deletion. A fix plan is pointless if the fix already exists in git history.

### 2. Identify the error source
Determine WHERE the error is coming from before investigating the code:
- **VSCode Problems panel** (source label: "Vue", "Volar", "ESLint", "TypeScript") → editor extension diagnostic, may be a false positive (Volar/vue-tsc version mismatch is common in this project)
- **Terminal / CLI** (`pnpm dev`, `pnpm build`, `vue-tsc --noEmit`, `pnpm lint`) → real tooling error
- **Browser console / Vite HMR overlay** → real runtime/render error
- **Docker container logs** (`docker compose logs app`) → deployment-environment error, not necessarily a code issue

Never treat a VSCode editor diagnostic as a CLI or runtime error without confirming. Volar can report stale type errors after dependency upgrades — restart the TS server before assuming the code is broken.

### 3. Check for existing suppression settings
Before planning a fix, check:
- `.vscode/settings.json` — does a suppression/pin setting already exist?
- `tsconfig.json` / `tsconfig.app.json` — is the path or rule already excluded?
- `eslint` config in `package.json` — is the rule already disabled for this path?
- Recent commits (`git log --grep=keyword`) — was this already addressed?

### 4. Apply minimum viable diagnosis
Ask: what is the simplest explanation that fits all the evidence?
- File not found → check `git status` before concluding the file is missing from the repo
- Build/lint error → confirm the error reproduces in CLI before assuming code needs to change
- Version-related error → confirm the installed version (`node -v`, `pnpm -v`, `cat package.json`) before assuming an upgrade is needed
- Vite HMR weirdness → try a clean restart (`rm -rf node_modules/.vite && pnpm dev`) before assuming a code bug

Only proceed with investigation and planning AFTER these checks pass. Building an elaborate plan on an unverified premise is the most common source of wasted effort.

## Plan-First Rule (MANDATORY)

ALWAYS enter plan mode (EnterPlanMode) before making any non-trivial changes. This applies even if the user doesn't explicitly ask for a plan.

**Non-trivial** = any change that modifies more than 1 file, adds new functionality, changes behavior, or touches configuration.

**Trivial** (skip plan mode) = single-line typo fix, adding a console.log, renaming a variable in one file.

If the user gives an instruction that requires non-trivial changes without requesting plan mode:
1. Enter plan mode proactively
2. Design the approach
3. Present for user approval
4. Only then execute

The user prefers human review before execution. Plan -> Review -> Execute.

## Verify-Before-Exit-Plan (Before Exiting Plan Mode)

Before calling ExitPlanMode, run these mechanical checks on your own plan. Do NOT skip these — tunnel vision during planning causes the most wasted review cycles.

### 1. Count check
If the plan says "N files modified" or "N steps", count them. Do the numbers match?

### 2. Path check
For every file path in the plan, verify it exists (Read/Glob) or is explicitly marked as "new file". For paths that reference current content (e.g., "lines 100-120"), read the file and confirm those lines contain what you think.

**Stale value absence**: When the plan updates a fact (count, version, date), grep the entire target file for the OLD value — not just the specific line.

### 3. Wiring check + consumer role-play
For every NEW file or feature, ask: "who consumes this?"

For this Vue 3 project, "wiring" means specifically:
- **Components** — registered/imported by a parent, or auto-imported via the Vite config?
- **Composables** — imported by at least one component or store?
- **Stores (Pinia)** — used by a component or another store?
- **Routes** — added to `src/router/`?
- **i18n strings** — added to all locale files in `src/locales/` (not just one)?
- **Services / API clients** — called by a component, store, or composable?

Then read each consumer's actual code and role-play as it: "I'm [consumer]. Do I have everything I need to use this new thing?"

### 4. Policy check
If the plan references or contradicts any rule in MEMORY.md, CLAUDE.md, or preferences — grep the source file and verify the actual text. Don't rely on memory of what the rule says.

### 5. Example content check
If the plan includes example content, templates, or sample data — verify it's from the correct project/context, not copy-pasted from a different source.

### 6. Completeness check
For each item in the plan, trace its full lifecycle: creation → wiring → testing → documentation. If any step is missing, add it. Then re-run check #1 (counts may have changed).

These checks take 2-3 minutes. Skipping them costs 30+ minutes in external review cycles.

---

## Stack Rules — Violence Prevention Frontend (Vue 3 + TypeScript + Vite)

<!-- IMPORTANT: CLAUDE.md is committed to git and visible to everyone on the team.
     Do NOT put secrets (API keys, DB passwords, JWT secrets) here.
     Use .env / .env.local for credentials. -->

### Project shape
- Vue 3 (Composition API) + TypeScript, built with Vite, package manager is **pnpm** (not npm or yarn).
- UI: Shadcn-vue (radix-vue / reka-ui under the hood) + Tailwind CSS. Component primitives live in `src/components/ui/`.
- State: Pinia stores in `src/stores/`.
- Routing: `vue-router` config in `src/router/`.
- i18n: `vue-i18n`, locale files in `src/locales/`.
- HTTP: `ofetch` + service modules in `src/services/`.
- DB tooling: Knex migrations/seeds (`migrations/`, `seeds/`, `knexfile.js`) — this project also has a small backend surface; do NOT confuse it with the Python ML backend at `../FYP_Violence_Prevention_backend`.
- Deployment: Docker + nginx (`Dockerfile`, `docker-compose.yml`, `nginx.conf`). See `DEPLOYMENT.md` before changing infra.

### Hard rules
- **Use pnpm, never npm/yarn.** Scripts in `package.json` assume pnpm. Mixing lockfiles will break the build.
- **TypeScript must pass `vue-tsc --noEmit`** before declaring a frontend change done. The `build` script runs this — use `pnpm build` as the final verification.
- **Don't bypass the Shadcn-vue primitives in `src/components/ui/`.** If you need a new variant, extend the existing primitive via `class-variance-authority`; don't fork a parallel implementation.
- **All user-facing strings go through `vue-i18n`.** Hardcoded English strings in templates are a bug. When adding a new key, add it to *every* locale file in `src/locales/` — missing locales fall back silently and ship broken UI.
- **API calls go through `src/services/`**, not directly from components. Components call composables or services; they do not call `ofetch` directly.
- **Pinia stores are the source of truth for shared state.** Don't duplicate state into component refs; subscribe to the store.
- **Path alias `@/` points to `src/`.** Use it for any non-relative import. Don't introduce new aliases without updating both `vite.config.mts` and `tsconfig.app.json`.
- **Tailwind only** — no inline `<style>` blocks for new code unless it's truly scoped/dynamic. Reuse existing `tailwind.config.js` design tokens.
- **Don't commit secrets or generated artifacts.** `dist/` is generated by build; never hand-edit it. `.env` files stay local.

### Before declaring a frontend change "done"
1. `pnpm lint` — passes (auto-fix is fine, but review what changed)
2. `pnpm build` — passes (this runs `vue-tsc --noEmit && vite build`)
3. If you added a route/page/component → load it in `pnpm dev` and confirm it renders, no console errors
4. If you touched anything user-facing → check at least one non-English locale to confirm i18n keys resolve
5. If you touched DB migrations → `pnpm migrate:latest` runs cleanly against a scratch DB

### Don't confuse the two backends
- This repo has a **small Node/Hono backend surface** for the web app (Knex migrations, `hono` package). That's app data — users, sessions, alert records.
- The **Python ML inference backend** lives at `../FYP_Violence_Prevention_backend` and runs separately (TensorFlow/OpenCV/MediaPipe/LSTM). Frontend talks to it via HTTP only.
- When the user says "backend", ask which one if it's ambiguous. Don't edit Python files from this repo.

## Compact Instructions

When auto-compacting or manually compacting this conversation, preserve:
- Current todo list with status of each item
- All file paths that were modified in this session
- Pending verification steps not yet completed (esp. `pnpm build`, `pnpm lint`, i18n key coverage)
- Key decisions made and their rationale
- Active plan context (what we're building and why)
- Any user preferences or constraints stated in this session
