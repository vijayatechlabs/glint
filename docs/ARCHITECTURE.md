# Glint — System Architecture

> **Glint** — the lightning publishing engine for the AI era.
> Git-native · static-output · agent-first · edge-delivered · AEO-native.
>
> Working name. Sanskrit-family alternates: **Tejas** (brilliance/speed) or
> **Vidyut** (lightning). Swap is a global find-replace.

**Status:** Decisions locked → Phase 0 · **Date:** 2026-06-02 · **Owner:** VijayaTech Labs
**Predecessor doc:** [`StaticBlog-concept.md`](StaticBlog-concept.md)

**Confirmed 2026-06-02:** (1) Name **Glint** · (2) Framework **Astro** ·
(3) Host **agnostic** — static `dist/` deploys anywhere; default **Cloudflare Pages**,
also Vercel / Netlify / VPS+Coolify (per-brand `deployTarget`) ·
(4) Pilot **naam.one** — migrate off WordPress · (5) Client dashboard tier **deferred to Phase 4**.

---

## 1. The one-liner

A publishing engine where **content is files in git**, **the AI agent is the
author**, **humans approve by reviewing a PR**, and the output is **pure static
HTML + a JSON/MD content API served from the edge**. WordPress-grade media and
reuse, none of the WordPress (or even EmDash) runtime.

The thing we are actually building is **not a CMS**. It is a thin, opinionated
**content contract + agent publishing loop + static build**, assembled on top of
Astro + Cloudflare + off-the-shelf auth. We build only the unique 20%; we reuse
everything else.

---

## 2. Why this exists (positioning)

| | Superblog | EmDash (Cloudflare) | **Glint** |
|---|---|---|---|
| Source of truth | Their Postgres (rented) | D1 / SQL (you operate) | **Git repo — Markdown + JSON (you own)** |
| Read path | Static export → CDN | SSR Worker + D1 (cached) | **Static files → CDN** |
| Authoring | Their dashboard | Admin UI | **Files + agent + PR review** |
| Agent model | MCP → their DB | MCP/CLI → its DB | **Agent lives in the repo, has brand/team context** |
| Human gate | Publish button | Publish button | **PR approval (phone)** |
| Ownership | Rent | Own & operate an app | **Own a thin template** |
| Ops burden | Zero (hosted) | Run Worker+D1+R2 per site | **Static deploy; near-zero** |
| Non-tech editor | ✅ | ✅ (its strength) | ❌ by design (optional tier) |
| Multi-brand agency | per-account | per-instance | **one engine, N brands** |

**Our moat is not "another CMS."** It is the **agent-in-the-repo workflow** plus
**agency-wide standardization**. EmDash is the modern WordPress (DB + admin, SSR
on the edge). Glint is the opposite bet: files, static, agent-native.

---

## 3. Design principles (the contract that never bends)

1. **Files are the source of truth.** No database on the read path, ever.
2. **Static-first delivery.** Pages are pre-built HTML on a CDN. Dynamic logic
   exists only at the edge, only for gating / forms / routing.
3. **Agent-native by repo context.** The agent publishes from inside the project
   repo, where brand config, team, and prior posts already live.
4. **Human-in-the-loop = PR review.** Approve on your phone; merge ships it.
5. **One contract, many brands.** Shared engine; per-brand content + config.
6. **Decoupled content.** One source compiles to web pages *and* a JSON/MD API
   that apps and mobile consume.
7. **AEO/SEO is compiled, not bolted on.** Schema, llms.txt, twins, sitemaps,
   internal links are build outputs.
8. **Lean.** Reuse Astro + Cloudflare + auth. Build only the unique 20%.

---

## 4. The layered architecture

```
                    ┌─────────────────────────────────────────┐
  voice / context → │  LAYER 5 — AGENT PUBLISHING LOOP         │
                    │  draft → file + media → PR → approve     │
                    └───────────────────┬─────────────────────┘
                                        │ commits to
                    ┌───────────────────▼─────────────────────┐
  per brand,  →     │  LAYER 1 — CONTENT SOURCE (git repo)     │
  you own           │  content/*.md  data/*.json  assets/      │
                    └───────────────────┬─────────────────────┘
                                        │ built by
                    ┌───────────────────▼─────────────────────┐
  shared,     →     │  LAYER 0 — THE ENGINE  @vijayatech/glint │
  reusable          │  Astro builder · schema · components ·   │
                    │  AEO emitters · CLI · agent skill        │
                    └───────────────────┬─────────────────────┘
                                        │ emits
                    ┌───────────────────▼─────────────────────┐
                    │  LAYER 2 — COMPILE OUTPUT                │
                    │  static HTML + JSON/MD API + twins +     │
                    │  sitemap + llms.txt + link graph + imgs  │
                    └───────────────────┬─────────────────────┘
                                        │ deployed to
                    ┌───────────────────▼─────────────────────┐
                    │  LAYER 3 — DELIVER (edge)                │
                    │  CF Pages (static) · CF Worker (thin) ·  │
                    │  R2 + Images (media)                     │
                    └───────────────────┬─────────────────────┘
                                        │ consumed by
                    ┌───────────────────▼─────────────────────┐
                    │  LAYER 4 — CONSUMERS                     │
                    │  marketing site · in-app blog · mobile · │
                    │  AI crawlers (raw .md / llms.txt)        │
                    └─────────────────────────────────────────┘
```

---

### LAYER 0 — The Engine (`@vijayatech/glint`, shared package)

The reusable core. Installed/cloned per brand; brands never fork the logic, only
the config + content.

```
@vijayatech/glint
├── builder/          Astro static build, content collections wiring
├── schema/           Zod schemas for every collection + frontmatter contract
├── components/       Typography, <Image>, <Cta>, <Ref>, <RelatedPosts>,
│                     JSON-LD emitters, <Gate> (teaser/body split)
├── aeo/              build emitters: JSON-LD, llms.txt, sitemap, RSS,
│                     /raw/*.md twins, IndexNow ping
├── graph/            internal-link graph + related-posts + link checker +
│                     redirect generator
├── cli/              glint new | build | preview | publish | doctor
└── agent/            the publishing Skill + MCP wiring (git/GitHub)
```

**Why a package, not a fork-per-brand:** engine improvements (a new schema field,
an AEO fix, a faster build) propagate to every brand with a version bump. This is
the "teach the team once" lever.

---

### LAYER 1 — Content Source (per brand, git repo)

```
<brand-repo>/
├── content/
│   ├── blog/2026-05-naam-rebrand.md
│   ├── case-studies/...
│   ├── news/...
│   ├── events/guru-pooja-may-2026.md
│   └── profiles/prasad.md
├── data/
│   ├── site.config.ts     # brand, theme, baseURL, enabled collections, SEO defaults
│   ├── team.json          # people registry (the vhpatp.org example)
│   ├── links.json         # shared link/CTA registry — single source of truth
│   └── redirects.json
├── assets/                # small, in-repo media (build-optimized)
└── glint.config.ts        # which engine version, mount strategy, gating tiers
```

**Frontmatter contract** (schema-validated at build — build fails on violation):

```yaml
---
title: "Guru Pooja held on May 22, 2026"
slug: "guru-pooja-may-2026"
collection: "events"
summary: "1–2 line meta description."
tags: ["event", "guru-pooja", "hyderabad"]
publishedAt: "2026-05-22T12:30:00+05:30"
visibility: "public"          # public | gated | members
images:
  - src: "r2://vhpatp/guru-pooja-1.jpg"
    alt: "Devotees seated during Guru Pooja"
    caption: "Closing prayers"
event:
  location: "VHP ATP Hall"
  date: "2026-05-21"
  attendees: [{ personId: "prasad", role: "President" }]
---
```

**`site.config.ts`** holds brand name, logo, colours, base URL, default SEO/OG,
and which collections are enabled. `team.json` / `links.json` are the registries
that make bulk edits a one-file change (see §6).

---

### LAYER 2 — Compile (one source → static site + content API)

A single `glint build` emits **all** of:

| Output | Path | Consumer |
|---|---|---|
| Static pages | `/<collection>/<slug>/` | Browsers, Google |
| Content API | `/api/<collection>.json`, `/api/<collection>/<slug>.json` | Apps, mobile |
| Markdown twins | `/raw/<collection>/<slug>.md` | LLM / AI crawlers |
| AEO surface | `/llms.txt`, `/sitemap.xml`, `/feed.xml`, inline JSON-LD | AI + search |
| Link graph | computed related-posts, hub pages, redirects | Internal linking |
| Media | responsive/WebP/AVIF variants (or R2 references) | All |

**No-full-rebuild concern, answered honestly:** at per-brand volumes (dozens to
low-hundreds of pages, occasional posting) a full Astro build is **seconds**, and
`git push → CI → deploy` is **~1 minute**. We do **not** need ISR or a server. If
a brand ever grows large, Astro incremental build covers it. Static stays static.

---

### LAYER 3 — Deliver (host-agnostic)

`glint build` emits a plain static `dist/` (HTML + JSON/MD API + AEO surface), so
**Glint deploys to any static host.** The host is a swappable choice per brand,
recorded as `deployTarget` in `data/site.config.ts` — never baked into the engine.

**Recommended default order:**

| Target | Best when | Mount `/blog` onto an app | Dynamic layer (gating/forms/IndexNow) |
|---|---|---|---|
| **Cloudflare Pages** (default) | content sites; DNS already on Cloudflare; zero-ops | CF Worker / routing rule | CF Worker |
| **Vercel** | the brand's app is already on Vercel/Next | rewrites / middleware | Vercel functions / Edge Middleware |
| **VPS + Coolify** | full ownership / cost-at-scale across many client sites | Traefik path routing | Astro Node adapter (or Hono) container |
| Netlify | git-deploy + an existing Netlify app | rewrites / Edge Functions | Netlify Functions |

The **read path is always static on a CDN.** The **thin dynamic layer** (gating on
`visibility: gated`, lead capture, IndexNow ping) is optional and adapts to the
host — a Cloudflare Worker, a Vercel/Netlify function, or a small Node container on
the VPS. We add a stateless *check*, never a server rendering pages from a DB.

**Media:** small images in-repo (build-optimized); heavy media to an S3-compatible
store — R2 (Cloudflare), Bunny, or self-hosted MinIO — referenced by the same
`s3://` convention, so the store is swappable without touching content.

---

### LAYER 4 — Consumers (one source, many readers)

```
buymycar.com/blog        → static pages, mounted via reverse-proxy onto the app
app.buymycar.com         → app fetches /api/blog.json for an in-app blog
BuyMyCar mobile app      → same /api/*.json + /raw/*.md
Google / Bing            → static HTML + sitemap + JSON-LD
ChatGPT / Claude / AI    → /raw/*.md twins + /llms.txt
```

This decoupling is the answer to "landing page vs full app vs mobile": the engine
doesn't care what reads it. Mount strategy is per-project config, not a rewrite.

---

### LAYER 5 — The Agent Publishing Loop (the unique product)

This is the part nobody else is built around: **the agent already lives where your
context lives.**

```
 You (voice / note / images)
        │   "For vhpatp, post the Guru Pooja event yesterday at ATP Hall.
        │    Prasad and Laxmi attended. Photos attached."
        ▼
 ┌─────────────────────────────────────────────────────────┐
 │  ORCHESTRATOR AGENT (runs in the brand repo)            │
 │  • detects brand from phrase → loads site.config.ts     │
 │  • reads data/team.json → maps "Prasad" → personId      │
 │  • has prior posts + brand voice as context             │
 ├─────────────────────────────────────────────────────────┤
 │  CONTENT AGENT                                          │
 │  • drafts title, summary, body, tags                    │
 │  • writes alt text + captions per photo                 │
 │  • suggests internal links from the link graph          │
 ├─────────────────────────────────────────────────────────┤
 │  PUBLISHER AGENT                                        │
 │  • uploads photos → R2 → rewrites image refs            │
 │  • writes content/events/<slug>.md (schema-valid)       │
 │  • opens a PR                                           │
 └───────────────────────────┬─────────────────────────────┘
                             ▼
              HUMAN GATE: you approve the PR on your phone
                             ▼
        merge to main → Coolify webhook → glint build → deploy (Nginx container)
                             ▼
              IndexNow ping · live in ~1 minute
              (GitHub Actions runs `glint doctor` on the PR as the pre-merge gate)
```

The same loop serves naam.one (`case-studies`), VijayaTech (`blog`), Hey Jira
(`news`), vhpatp.org (`events`). One contract, one flow, every brand.

| Agent | Trigger | What it does |
|---|---|---|
| **Orchestrator** | Voice/note in | Detects brand, loads config + team registry, sets context |
| **Content** | After orchestration | Drafts post, alt text, captions, internal-link suggestions |
| **Publisher** | After draft | Uploads media to R2, writes schema-valid file, opens PR |
| **Builder** (CI) | PR merge | `glint build` → deploy → IndexNow ping |
| **Doctor** | Pre-merge check | Schema validation, broken-link check, image alt presence |

---

## 5. Access control (gating without a database)

Three tiers, declared per post via `visibility`:

| Tier | Build behaviour | Delivery |
|---|---|---|
| `public` | Full static page | CDN, indexed |
| `gated` | Static **teaser** ships (indexed); body excluded from public HTML | Edge-service container checks cookie/JWT, serves body from protected endpoint after auth |
| `members` | **Not in static build** at all | Served only via authenticated app route |

**Identity:** reuse existing app auth (BuyMyCar / Vishwakarma accounts) where it
exists; Cloudflare Access for internal docs; Clerk/Supabase Auth for new public
signup. We do **not** build identity.

---

## 6. Bulk edits & shared links (where files beat WordPress)

- **Single source of truth:** `data/links.json` holds canonical URLs, CTAs,
  product names, contact info. Posts reference `<Cta id="demo"/>` / `<Ref to="pricing"/>`
  which resolve at build. **Change one file → rebuild → every post updates.**
- **True bulk edits:** find-and-replace across files (or an agent), reviewed as a
  **git diff** in a PR, revertable. WordPress can't show you that.
- **Integrity:** build-time link checker fails the build on broken internal links;
  slug renames auto-generate redirects in `redirects.json`.

---

## 7. Media strategy

Hybrid, build-optimized:

- **Small / inline images** → `assets/` in the repo. Astro generates responsive
  WebP/AVIF variants at build (precomputed, faster than WP's runtime resizing).
- **Heavy media** (event galleries, video) → **MinIO** (S3-compatible, self-hosted
  on the VPS via Coolify), referenced as `s3://brand/file.jpg` in frontmatter.
  S3 API means we can swap to Bunny Storage/CDN or Cloudflare R2 later with zero
  content changes. Variants generated at build; Bunny/CF CDN for on-the-fly resize
  if/when global media delivery matters.
- **Agent flow:** upload → canonical URL → frontmatter manifest with agent-written
  `alt` + `caption`. The "media library" is R2 + the per-post manifest.

---

## 8. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Static builder | **Astro** (static output) | Ships zero JS by default; best CWV/SEO; Content Collections = typed contract |
| Content format | **Markdown + frontmatter** (MDX only where components needed) | Clean `/raw/*.md` twins for AEO; plain MD = the twin is free |
| Schema | **Zod** via Astro Content Collections | Agent contract enforced at build |
| Host + PaaS | **Hostinger VPS + Coolify** | Self-hosted, owned, Docker + Traefik + auto-TLS + git-deploy |
| CDN (front) | **Cloudflare free plan** (optional) | Global cache/TLS/DDoS in front of VPS origin |
| Static serving | **Nginx/Caddy container** (Coolify) | Serves `glint build` output — the read path |
| Dynamic logic | **Astro Node adapter / Hono container** | Gating, forms, IndexNow, `/blog` mount via Traefik |
| Media | **MinIO** (S3-compatible, on VPS) | Self-hosted; swappable for Bunny/R2 (same S3 API) |
| Auth / gating | **app-auth / Clerk / Authelia** | Reuse, don't build identity |
| CI/CD | **GitHub Actions (validate) + Coolify (deploy)** | PR = human gate; merge → Coolify build & deploy |
| Agent | **Claude Code skill + MCP (git/GitHub)** | Publishes from inside the repo |
| AEO | **Glint build emitters** | JSON-LD, llms.txt, sitemap, twins, IndexNow |

---

## 9. What we build vs reuse (the lean boundary)

**Build (the unique 20%)**
- The content contract + Zod schemas
- AEO emitters (JSON-LD, llms.txt, twins, sitemap, IndexNow)
- Internal-link graph + checker + redirect generator
- The Glint CLI
- The **agent publishing skill** (draft → file → PR) — *the product*
- Reverse-proxy `/blog` mount glue + content-API output
- `links.json` registry resolution

**Reuse (don't reinvent)**
- Astro (build, image pipeline, content collections)
- Coolify (Docker orchestration, Traefik proxy, TLS, git-deploy) + Hostinger VPS
- MinIO (S3 storage), optional Cloudflare free CDN in front
- Auth/identity (Clerk / Authelia / existing app auth)

**Explicitly out of scope (use EmDash if a client needs it)**
- A non-technical-editor admin dashboard. If a client must log in and publish
  themselves, that's the optional **EmDash tier** — we do not build a WP-class CMS.

---

## 10. Multi-brand topology

```
@vijayatech/glint  (engine, versioned package)
   ├── naam.one          (case-studies)        → standalone static site
   ├── vijayatech.in     (blog)                → standalone static site
   ├── vhpatp.org        (events, news)        → standalone static site
   ├── buymycar.com      (blog)                → reverse-proxy /blog onto the app
   └── vishwakarma       (news + content API)  → site + mobile consume /api/*.json
```

Each brand = its own content repo + `site.config.ts`, same engine version. New
brand = `glint new`, edit config, deploy — live in a day.

---

## 11. Roadmap (phased)

| Phase | Goal | Exit criteria |
|---|---|---|
| **0 — Spike + Migrate** | Engine skeleton + **naam.one migrated off WordPress**, deployed on Coolify | naam.one case-studies render as static HTML via Coolify with JSON-LD + sitemap; WP content + media imported |
| **1 — Agent loop** | Draft → file → PR → deploy | A voice/note publishes a post via PR with zero dashboard |
| **2 — Decouple** | Content API + gated tier + `/blog` proxy mount | App consumes `/api/*.json`; a gated post works; `/blog` mounts onto an app via Traefik |
| **3 — Scale** | MinIO media + multi-brand cloning + AEO polish | 2+ brands live from the same engine; llms.txt/twins verified |
| **4 — Optional** | Client dashboard tier (EmDash) for non-tech editors | One client self-publishes without touching git |

### Phase 0 — naam.one WordPress migration (sub-steps)

```
1. Export WP content   → WXR export OR WordPress REST API (/wp-json/wp/v2/*)
2. Transform           → glint importer: posts/case-studies → content/*.md
                         with mapped frontmatter (title, slug, date, tags, SEO)
3. Pull media          → download WP uploads → MinIO → rewrite image refs
4. Map URLs            → preserve old WP slugs; generate redirects.json for any change
5. Verify              → glint doctor (schema + broken links) + visual diff vs live
6. Deploy              → Coolify static container; cut DNS over once verified
```

The WP→Markdown importer is a reusable `glint import wordpress` command — every
future WordPress client migration reuses it.

---

## 12. Decisions — resolved (2026-06-02)

1. ✅ **Name** — Glint
2. ✅ **Framework** — Astro
3. ✅ **Host** — Hostinger VPS + Coolify
4. ✅ **Pilot** — naam.one (migrate off WordPress)
5. ✅ **Client dashboard tier** — deferred to Phase 4

### Sub-decisions introduced by the VPS/Coolify choice (recommended defaults)

| Question | Recommended default | Note |
|---|---|---|
| Cloudflare free CDN in front of the VPS? | **Yes** | Global cache + TLS + DDoS, free, origin stays the VPS. Drop for pure single-region VPS. |
| Heavy-media storage | **MinIO on the VPS** | Self-hosted, S3 API → swap to Bunny/R2 later with no content change. |
| Build & deploy | **Coolify git-deploy + GH Actions for `glint doctor`** | Merge to `main` → Coolify builds & deploys; PR check is the human gate. |
| Dynamic layer runtime | **Astro Node adapter container** | One small service for gating/forms/IndexNow; everything else static. |

---

*Next step: scaffold `@vijayatech/glint` and run the naam.one WP migration (Phase 0).
Run `/init-project` to bring this StaticBlog workspace under the VijayaTech framework
when we start building.*
