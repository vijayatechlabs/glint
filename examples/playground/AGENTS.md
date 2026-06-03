# AGENTS.md — Glint (a Glint site)

Standing instructions for any agent in this repo (Antigravity, Claude Code, Codex,
Cursor). Read this before doing anything.

## What this repo is
The blog for **Glint**, built on **Glint**
(`@vijayatech/glint`). Content is Markdown; you author it; a human approves via PR;
it builds to static HTML at **example.com**. Not WordPress, not a CMS.

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
5. **Branch `content/<slug>`, run `glint doctor`, open a PR.**
6. A human reviews voice + accuracy, merges, flips `draft: false`.

Scheduled batches: an agent runner (cron / scheduled task) fires "draft the next N
approved items from `data/content-plan.md`" — same flow, no engine code.

## Don't
- Don't deploy, touch DNS, flip drafts live, or push to `main`.
- 🔒 **Don't modify the Glint engine** (`@vijayatech/glint` or any nested `glint/`
  clone). It's shared and read-only here.

## Found a gap or bug in Glint?
**File feedback — don't patch the engine.** Run:
```
glint feedback "what's missing or broken" --type enhancement --area build
```
It logs to `glint-feedback.md` and prints a GitHub issue for the engine repo.
The maintainer changes Glint; you pull the update.

Engine reference: `@vijayatech/glint` → `docs/AGENT-GUIDE.md`, `docs/INIT.md`, `docs/FEEDBACK.md`.
