# Glint — Agent Guide (read this first)

The single operating contract for **any** agent working in a Glint repo —
Claude Code, Google Antigravity (Gemini), Codex, Cursor. Keep every tool in sync
by editing **this** file; per-tool files (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`)
are thin pointers to it.

> Analogous to OpenStart's `AGENT-GUIDE.md` — but for the publishing engine.

---

## 1. What Glint is

A git-native, static-output, agent-first publishing engine. **Content is files**
(Markdown + JSON), **the agent is the author**, **humans approve via PR**, and the
build emits **static HTML + a JSON/MD content API** served from a CDN. Not a CMS.

Full design: `docs/ARCHITECTURE.md`.

## 2. Operating principles (non-negotiable)

1. **Files are the source of truth.** No database on the read path.
2. **Draft-first.** New/imported/AI-written content lands as `draft: true`. It goes
   live only when a human flips it and merges.
3. **PR is the human gate.** Agents never push to `main`. Open a PR; a human reviews.
4. **Brand voice is law.** Read `docs/brand-voice.md` before writing a word and
   enforce it. If a brand has no voice guide, draft one and get it approved first.
5. **On-topic or don't ship.** A post must deliver exactly what its title promises.
6. **AEO is compiled.** Schema/JSON-LD, `llms.txt`, sitemaps, markdown twins,
   internal links are build outputs — don't hand-write them into bodies.
7. **Lean.** Reuse Astro + the host's primitives. Build only the unique 20%.

## 3. Repo layout

- **Engine** (`@vijayatech/glint`, this repo) — shared package: content schema,
  CLI, importer, build integration, AEO emitters. Brands depend on it; never fork.
- **Brand site** (e.g. `naam-blog`) — one repo per brand: `content/`, `data/`,
  `public/media/`, `docs/brand-voice.md`, deploy config. Where content work happens.

## 4. The content lifecycle (the step-by-step)

Start with **`glint init`** — it discovers the project's state and prints the
right plan. The full state-aware flow is in **`docs/INIT.md`**.

```
0. INIT (discover)        → glint init   → fresh | migration | adopt | established
1. UNFOLD                 → glint new    → scaffold structure + agent files (idempotent)
2. VOICE                  → create/analyse docs/brand-voice.md (approve FIRST)
3. IMPORT (if migrating)  → glint import wordpress --wxr <file> --out <repo>
4. AUDIT                  → read docs/CONTENT-AUDIT.md; triage each post
5. WRITE / REGENERATE     → draft to docs/brand-voice.md; on-topic; draft:true
6. DOCTOR                 → glint doctor (schema, alt text, links, scaffolding)
7. REVIEW (human gate)    → open a PR; human approves/edits
8. PUBLISH                → flip draft:false on approved posts; merge
9. BUILD + DEPLOY         → CI builds static → CDN (e.g. Cloudflare Pages)
10. REDIRECTS + INDEXNOW  → apply redirects.json; ping IndexNow on publish
```

Steps 5–8 are the loop you repeat per post or batch.

## 5. CLI commands

| Command | Does |
|---|---|
| `glint init [--dir .] [--json]` | Discover state (fresh/migration/adopt/established) + print plan |
| `glint new [--brand --domain --collections --mount --target]` | Scaffold/complete structure + agent files + taxonomy registries (idempotent) |
| `glint status [--dir .]` | Content board — every post by status (draft/scheduled/published) |
| `glint import wordpress --wxr <f> --out <repo>` | WXR → Markdown drafts + media + `redirects.json` + audit |
| `glint doctor [--dir .]` | Validate schema, scaffolding leaks, taxonomy registry, dup slugs, broken internal links (fails on ERROR) |
| `glint build [--dir .]` | Astro static build → HTML + JSON-LD + sitemap + RSS + llms.txt + /raw twins + JSON API (drafts excluded) |
| `glint preview [--dir .]` | Astro dev server with drafts visible (`noindex` banner) |

Run in dev via `pnpm glint <cmd>` from the engine, or the installed `glint` bin.

## 6. Conventions

- **Frontmatter contract:** defined in `src/content/schema.ts` (Zod). Required:
  `title`, `summary` (= meta description), `publishedAt`. Optional: `slug`
  (derived from filename if omitted), `category`, `tags`, `cover{src,alt}`,
  `images[]`, `visibility` (`public`|`gated`|`members`), `draft`,
  `author` (→ `data/team.json`).
- **Taxonomy:** one `category` + many `tags`, both validated against the
  `data/categories.md` / `data/tags.md` registries. Reuse terms — never invent.
- **Status (git-native):** `draft:true` = draft (404 in prod); open PR = pending
  review; future `publishedAt` = scheduled; `draft:false` = live. No status folders.
  See `docs/BLOG-SPEC.md` for the full SEO/AEO definition of done.
- **Slugs:** kebab-case; preserve old slugs on migration or add a `redirects.json`
  entry. Never silently break a live URL.
- **Media:** small images in `public/media/` (or `assets/`); heavy media to the
  object store (MinIO/R2/Bunny). Every image needs real `alt` text.
- **Visibility tiers:** `public` (static, indexed), `gated` (static teaser + body
  behind an edge auth check), `members` (excluded from the static build).
- **No leaked scaffolding** in bodies: `Meta Description:`, `SEO Slug:`,
  `Alt Text:`, `SEO-Optimized Title:` belong in frontmatter, never prose.

## 7. Where to write docs (per brand repo)

| What | File |
|---|---|
| Brand voice & tone | `docs/brand-voice.md` |
| Content triage/audit | `docs/CONTENT-AUDIT.md` (auto-generated by import) |
| Categories / tags registry | `data/categories.md` / `data/tags.md` |
| SEO/AEO spec (definition of done) | engine `docs/BLOG-SPEC.md` |
| Architecture / decisions | engine `docs/ARCHITECTURE.md` |
| Old→new URL map | `redirects.json` (repo root) |

## 8. Multi-agent sync

Edit this guide to change how agents behave. The brand repo's `AGENTS.md` is the
always-on entry point every tool reads; `GEMINI.md` (Antigravity/Gemini) and
`CLAUDE.md` (Claude Code) just point to it. Keep them as thin pointers so the
three tools never drift.
