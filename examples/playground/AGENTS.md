# AGENTS.md — Glint (a Glint site)

Standing instructions for any agent in this repo (Antigravity, Claude Code, Codex,
Cursor). Read this before doing anything.

## What this repo is
The blog for **Glint**, built on **Glint**
(`@vijayatech/glint`). Content is Markdown; you author it; a human approves via PR;
it builds to static HTML at **example.com/**. Not WordPress, not a CMS.

## Always read first
1. `data/content-strategy.md` — what to write & why (pillars, ICP, cadence, rules).
2. `docs/content-playbook.md` — blog types + how to structure each for answer engines.
3. `docs/brand-voice.md` — the voice. Enforce it on every word.
4. `data/categories.md` / `data/tags.md` — the taxonomy to file under.
5. `docs/CONTENT-AUDIT.md` — triage of imported posts (if this was a migration).

## Hard rules
- **Draft-first:** everything stays `draft: true` until a human flips it.
- **PR is the gate:** work on `content/<slug>`, open a PR, never push to `main`.
- **On-topic or don't ship:** the body must deliver exactly what the title promises.
- **Voice is law:** no generic AI filler. See `docs/brand-voice.md`.
- **No leaked scaffolding** (`Meta Description:`, `SEO Slug:`, `Alt Text:`) in bodies.
- **Don't break URLs:** keep slugs stable or add a `redirects.json` entry.
- **Every image needs real `alt` text.**
- **Stagger publish dates:** never stamp a batch with one timestamp — sequence
  `publishedAt` per the cadence in `data/content-strategy.md`.
- **No duplicate posts:** scan `content/` + `data/content-plan.md`; sharpen the angle
  instead of repeating an existing post.
- **Review gate:** self-check against `docs/blog-review-checklist.md` before the PR.

## Frontmatter contract (`content/<collection>/<slug>.md`)
```yaml
---
title: "Specific, benefit-led"
summary: "1–2 sentences; doubles as the meta description"
tags: []
publishedAt: 2026-01-01T00:00:00.000Z
visibility: public        # public | gated | members
draft: true
cover: { src: /media/<slug>.png, alt: "describes the image + relevance" }
---
```

## Pipeline commands

Run these slash commands or CLI equivalents to execute the content pipeline:

- **plan**: Proposals & shortlists.
  - Claude: `/plan` or `claude -p "/plan"`
  - Antigravity: `/plan` or `gemini -p "$(cat docs/pipeline/plan.md)"`
  - Codex: `codex exec "Run docs/pipeline/plan.md"`
- **draft**: Write draft based on topic/slug.
  - Claude: `/draft <topic>` or `claude -p "/draft <topic>"`
  - Antigravity: `/draft <topic>` or `gemini -p "$(cat docs/pipeline/draft.md)\n\nTopic: <topic>"`
  - Codex: `codex exec "Run docs/pipeline/draft.md for <topic>"`
- **images**: Generate cover & inline images.
  - Claude: `/images <slug>` or `claude -p "/images <slug>"`
  - Antigravity: `/images <slug>` or `gemini -p "$(cat docs/pipeline/images.md)\n\nSlug: <slug>"`
  - Codex: `codex exec "Run docs/pipeline/images.md for <slug>"`
- **review**: Verify post against style & rules.
  - Claude: `/review <slug>` or `claude -p "/review <slug>"`
  - Antigravity: `/review <slug>` or `gemini -p "$(cat docs/pipeline/review.md)\n\nSlug: <slug>"`
  - Codex: `codex exec "Run docs/pipeline/review.md for <slug>"`
- **ship**: Pre-merge quality gate check.
  - Claude: `/ship <slug>` or `claude -p "/ship <slug>"`
  - Antigravity: `/ship <slug>` or `gemini -p "$(cat docs/pipeline/ship.md)\n\nSlug: <slug>"`
  - Codex: `codex exec "Run docs/pipeline/ship.md for <slug>"`

## Content generation (how to write a post)
1. **Ideate.** Read `data/content-strategy.md` (pick a Pillar + Type). Scan existing
   `content/` and `data/content-plan.md` to avoid duplication and find gaps.
2. **Research.** Use your native web search; **cite sources**; never invent stats or
   assert decaying facts (prices, "available domains") as permanent.
3. **Propose titles first.** Offer a short shortlist (log to `data/content-plan.md` as
   `idea`); let the human pick before drafting. Don't jump straight to a full draft.
4. **Draft** the chosen title per `docs/content-playbook.md` (answer-first, question
   headings, a table/steps where it fits, an FAQ, sources). Enforce the brand voice +
   frontmatter contract; set `category`/`tags` from the registries. Keep `draft: true`.
5. **Self-review** against `docs/blog-review-checklist.md` (every **[human]** item)
   before opening the PR — don't hand a reviewer work you can clear yourself.
6. **Branch `content/<slug>`, run `pnpm glint doctor`, open a PR.**
7. A human reviews against `docs/blog-review-checklist.md`, merges, flips `draft: false`.

Scheduled batches: an agent runner (cron / scheduled task) fires "draft the next N
approved items from `data/content-plan.md`" — same flow, no engine code.

## Don't
- Don't deploy, touch DNS, flip drafts live, or push to `main`.
- 🔒 **Don't modify the Glint engine** (`@vijayatech/glint` or any nested `glint/`
  clone). It's shared and read-only here.

## Running the engine CLI
The engine is the `@vijayatech/glint` dependency, not a folder in this repo. Run it
as a package script from the repo root — **no global install**:
```
pnpm glint <command>      # sync · doctor · status · build · preview · feedback
```
(Equivalently `npx glint <command>`.) Bare `glint` won't work — the binary lives in
`node_modules/.bin`, not on your PATH.

## Updating Glint
The engine and this site update **separately**:
1. `pnpm update @vijayatech/glint` — pull the latest engine (schema, CLI, build
   logic). Schema/validator changes apply immediately.
2. `pnpm glint sync --dry-run` — preview which **engine-managed** files would change
   (this is also the live answer to "which files are mine vs the engine's").
3. `pnpm glint sync` — apply. It overwrites engine-reference docs and regenerates
   engine-generated files (this AGENTS.md, the review checklist, agent rules) from
   your `data/site.config.ts`. It **never touches** brand-owned files: your
   `brand-voice.md`, `categories.md`, `content-strategy.md`, theme tokens, or content.

## Leaving Glint (no lock-in)
Your content is portable Markdown — there's no database or runtime to escape:
- **Take your content:** copy `content/` (posts) and `public/media/` (images). Done.
- **Drop the engine, keep the site:** remove `@vijayatech/glint` from `package.json`;
  the Astro theme in `src/` was copied in at scaffold time and still `astro build`s
  (you lose `doctor`/`sync`/`status`, not the site).
- **Delete everything:** `rm -rf` this repo. Nothing lingers — no DB, no daemon, no
  cloud state. What you deployed was static HTML.

## Found a gap or bug in Glint?
**File feedback — don't patch the engine.** Run:
```
pnpm glint feedback "what's missing or broken" --type enhancement --area build
```
It logs to `glint-feedback.md` and prints a GitHub issue for the engine repo.
The maintainer changes Glint; you pull the update.

Engine reference: `@vijayatech/glint` → `docs/AGENT-GUIDE.md`, `docs/INIT.md`, `docs/FEEDBACK.md`.
