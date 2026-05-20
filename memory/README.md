# Memory — Violence Prevention Frontend

This directory is where Claude Code's **auto-memory system** writes persistent notes about this project. Claude reads `MEMORY.md` (index) and the individual `*.md` files in here at the start of every session.

## What goes in here

Auto-memory captures four kinds of long-lived context:

| Type | What | Example |
|------|------|---------|
| `user` | Facts about you (role, preferences, expertise) | "Final-year student; comfortable with Vue 3 but new to LSTM training" |
| `feedback` | Corrections + validated approaches | "Don't auto-rename Pinia store IDs — used in localStorage keys (reason: I lost saved state once)" |
| `project` | Ongoing initiatives, deadlines, decisions | "FYP demo deadline: 2026-06-15; defense panel cares about live alert flow" |
| `reference` | Pointers to external systems | "Alert WAV samples live in `../FYP_Violence_Prevention_backend/alert.wav`" |

## What does NOT go in here

- Code conventions → use `CLAUDE.md` (committed, team-visible) or `.claude/rules/*` (path-scoped)
- One-off task state → use the in-session todo list
- Anything already in `git log` / `git blame`
- Secrets or credentials (these files are not gitignored by default — check before committing)

## Index file

`MEMORY.md` (one level up, in the project root, OR inside this folder depending on Claude Code's resolution) is the index. Keep entries one-line and short — it's loaded into every session's context.

## How to populate

You don't author these manually. Claude will write to this directory automatically when it observes facts worth keeping ("I learned X about you / the project"). If you want to seed something explicitly, just tell Claude: "Remember that the FYP supervisor is X" or "Save this preference to memory."

## Stale memory

If Claude cites a memory that turned out to be wrong, ask it to remove or update the entry. Memories are time-stamped; old ones decay.
