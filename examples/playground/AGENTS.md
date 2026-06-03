# AGENTS.md — Glint (a Glint site)

Standing instructions for any agent in this repo (Antigravity, Claude Code, Codex,
Cursor). Read this before doing anything.

## What this repo is
The blog for **Glint**, built on **Glint**
(`@vijayatech/glint`). Content is Markdown; you author it; a human approves via PR;
it builds to static HTML at **example.com**. Not WordPress, not a CMS.

## Always read first
1. `docs/brand-voice.md` — the voice. Enforce it on every word.
2. `docs/CONTENT-AUDIT.md` — triage of imported posts (if this was a migration).

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

## Workflow
1. Pick targets (from the audit or a topic plan).
2. Write fresh, on-topic, on-voice content; keep `draft: true`.
3. Branch `content/<slug>`, commit, open a PR with a short rationale.
4. A human reviews voice + accuracy, merges, flips `draft: false`.

## Don't
Don't deploy, touch DNS, flip drafts live, or push to `main`.

Engine reference: `@vijayatech/glint` → `docs/AGENT-GUIDE.md`, `docs/INIT.md`.
