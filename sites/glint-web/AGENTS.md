# AGENTS.md — glint-web (Glint's own site)

Standing instructions for any agent in this repo (Claude Code, Antigravity, Codex).
Read this before doing anything.

## What this repo is

The blog for **Glint** itself — `glint.vijayatech.in` — built on Glint (`@vijayatech/glint`
at `../../`). This is the dogfood site: every published post demonstrates the AEO
surface (llms.txt, /raw twins, JSON-LD, JSON API) to the exact audience Glint is built for.

This site lives in `sites/glint-web/` inside the engine monorepo. The engine source
is two directories up at the repo root.

## Always read first

1. `data/content-strategy.md` — what to write & why (pillars, ICP, cadence, rules).
2. `docs/brand-voice.md` — the Glint voice. Direct, precise, honest, concise.
3. `docs/content-playbook.md` — blog types + how to structure each for answer engines.
4. `data/categories.md` / `data/tags.md` — the taxonomy.
5. `data/content-plan.md` — what's planned, drafted, published.

## Hard rules

- **Draft-first:** everything stays `draft: true` until a human flips it.
- **PR is the gate:** branch off `content/<slug>`, open a PR, never push to `main`.
- **On-topic or don't ship:** the body must deliver exactly what the title promises.
- **Voice is law:** no generic AI filler. See `docs/brand-voice.md`.
- **No comparison trash-talk:** name the cases where the competing tool wins.
- **Cite sources:** any claim about star counts, adoption numbers, or tool behaviour
  must link to the source. We're writing for readers who will check.
- **Don't break URLs:** keep slugs stable or add a `redirects.json` entry.
- **Every image needs real `alt` text.**
- **Stagger publish dates:** sequence `publishedAt` per the cadence in `data/content-strategy.md`.

## Frontmatter contract

```yaml
---
title: "Specific, benefit-led — name the exact thing being compared or explained"
summary: "1–2 sentences; doubles as the meta description; no filler"
category: comparisons          # must be in data/categories.md
tags: [astro, aeo, llms-txt]   # must be in data/tags.md
publishedAt: 2026-06-01T09:00:00.000Z
visibility: public
draft: true
cover:
  src: /media/<slug>-cover.png
  alt: "Describes the specific image + why it's relevant to this post"
---
```

## Running the engine

The engine is the `@vijayatech/glint` dependency at `../../`. From `sites/glint-web/`:

```sh
cd ../../ && pnpm build   # build the engine first (if local dev)
cd sites/glint-web
pnpm install
pnpm glint doctor         # validate content
pnpm glint status         # content board
pnpm build                # full site build
```

## Don't

- Don't modify the engine (`../../src/`) from here — file a `glint feedback` issue.
- Don't deploy, flip drafts live, or push directly to `main`.
- Don't invent frontmatter fields not in the schema (`../../src/content/schema.ts`).
