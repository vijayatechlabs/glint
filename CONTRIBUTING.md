# Contributing to Glint

## Maintenance rules — the short version

These keep the docs trustworthy without ceremony:

1. **CHANGELOG.md** — update `[Unreleased]` in the **same commit** as any
   user-facing change (new command, changed behaviour, bug fix). When cutting a
   release, rename `[Unreleased]` to `[x.y.z] — YYYY-MM-DD` and open a fresh
   `[Unreleased]` above it.

2. **docs/DECISIONS.md** — append a dated entry whenever you make an architectural
   call that isn't obvious from the code (why X over Y, what was rejected). Never
   edit past entries; add new ones referencing the old ones if something changes.

3. **docs/ARCHITECTURE.md** — update only when the model, layers, or tech-stack
   change. It is the durable "how it's built" reference, not a sprint log.

4. **Roadmap** — canonical home is `docs/ARCHITECTURE.md §11`. README and other
   docs link there; they never duplicate it.

5. **Tasks / backlog** — GitHub Issues only. No `TASKS.md`. Use `glint feedback`
   to log engine gaps (it prints a pre-filled issue URL).

## What not to maintain

- No `TASKS.md`, `CURRENT-STATUS.md`, or `RISKS.md` — overhead for a small team;
  CHANGELOG + Issues cover the same ground.
- No per-PR doc updates unless a doc is factually wrong after the change.

## Versioning

Follows [Semantic Versioning](https://semver.org):
- **Patch** (0.0.x) — bug fixes, internal refactors with no CLI/schema change.
- **Minor** (0.x.0) — new commands, new schema fields (backwards-compatible).
- **Major** (x.0.0) — breaking CLI changes or schema changes that require brand-site
  migration.

## Running the engine locally

```bash
pnpm install
pnpm typecheck          # must be clean before any commit
pnpm build              # tsup → dist/
pnpm glint <cmd>        # run a CLI command from the engine repo itself
```

The `examples/playground/` site is the reference brand for manual testing.
