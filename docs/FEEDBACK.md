# Glint Feedback Pipeline

How brand projects improve Glint **without editing the engine**. The engine is
the single source of truth; many projects (run by different agents and people)
consume it; feedback flows *in*, fixes flow *out*.

## The rule (non-negotiable)

> **Projects never modify the Glint engine.** No patching `@vijayatech/glint` or a
> nested `glint/` clone inside a brand repo. If something is missing or broken,
> **file feedback** — the maintainer changes the engine.

This is enforced in every scaffolded brand repo's `AGENTS.md` and
`.agents/rules/glint.md`, so Claude / Antigravity / Codex all respect it.

## The loop

```
  PROJECT (agent or human)
  hits a gap/bug/idea while using Glint
        │
        │  glint feedback "…" --type enhancement --area build
        ▼
  glint-feedback.md (local log)  +  ready-to-file GitHub issue text
        │
        │  file on the engine queue
        ▼
  GitHub Issues — github.com/vijayatechlabs/glint/issues   ← the queue
        │  (structured via the "Glint feedback" issue form)
        ▼
  MAINTAINER triages → branch → implement on the engine → PR → merge → tag
        │
        ▼
  PROJECTS pull the update  (git pull / pnpm update — see GETTING-STARTED §5)
```

## Capturing feedback (from a project)

```bash
glint feedback "build should emit category archive pages" --type enhancement --area build
glint feedback "doctor missed an empty summary" --type bug --area doctor
```
This appends a structured entry to the project's `glint-feedback.md` **and** prints
a GitHub issue (title/body/labels) to paste at
`github.com/vijayatechlabs/glint/issues/new`, or a `gh issue create` one-liner.

Why both? The local log always works offline and travels with the project; the
GitHub issue is the shared, triageable queue across all projects and agents.

## Triage (maintainer)

- **Labels:** `feedback` + one of `bug` / `enhancement` / `aeo` / `dx` / `docs`.
- **Priority for SEO/AEO-affecting items** (see `BLOG-SPEC.md`) over UX/DX nice-to-haves.
- Implement on a branch → PR → merge to `main` → tag a version.
- Close the issue referencing the commit; projects pull on their own cadence.

## Roles

| Who | Does | Never |
|---|---|---|
| **Projects** (naam-blog, …) | use Glint, run `glint feedback` | edit the engine |
| **Maintainer** (you + Claude) | triage issues, implement, release | hand-patch brand repos |

## Why not let projects patch the engine?

One engine, many consumers. If each project forks/patches, you get N divergent
Glints and lose the "improve once, every brand benefits" property. Feedback-in /
fixes-out keeps a single, improving source of truth.
