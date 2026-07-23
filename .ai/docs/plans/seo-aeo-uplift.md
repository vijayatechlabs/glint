# Plan: SEO/AEO Uplift — Faster Indexing + AI Citation

**Status:** engine gate items largely complete (2026-07-23) — see §7  
**Date:** 2026-07-22 (updated 2026-07-23)  
**Owner:** Glint engine  
**Related:** `docs/ORGANIC-GROWTH-PLAN.md` (WS3 + §12 review), `docs/BLOG-SPEC.md` (§4), `.ai/docs/plans/indexnow.md`, `docs/AEO.md`  
**Philosophy:** zero-config build-time emitters first; external-credential features are opt-in CLI with guided setup.  
**Honest non-claim:** Emitters improve **eligibility** (crawl, structure, fetchability). They do **not** guarantee rankings or AI citations.

---

## 0. Context

Glint already emits: JSON-LD `BlogPosting` + `BreadcrumbList`, canonical, OG/Twitter, `llms.txt` (URL index), `/raw` markdown twins, RSS, sitemap, IndexNow (Bing/Yandex/Naver), related posts, category/tag archives, Pagefind, GA4/CF analytics, GSC/Bing verification, and `glint doctor`.

**What's missing (ranked by impact on indexing speed + AI citation):**

| # | Gap | Impact | Engine status (2026-07-23) |
|---|-----|--------|----------------------------|
| 1 | `llms-full.txt` | High | ✅ templates + size guard + Base alternate |
| 2 | `article:*` meta | High | ✅ post templates + resolved author name |
| 3 | Organization / Person JSON-LD | High | ✅ Org + Person via `team.json` / resolveAuthor |
| 4 | FAQPage / HowTo JSON-LD | High | ✅ schema + emission |
| 5 | Sitemap `lastmod` | High | ✅ `glintSitemapLastmod` + mount path matching |
| 6 | Google Indexing API for blogs | n/a | ✅ gated (`--force` only); setup warns |
| 7 | AI crawler robots policy | Medium | ✅ templates + doctor |
| 8 | WebSite + SearchAction | Medium | ✅ index templates |
| 9 | RSS enrichment | Medium | ✅ author + categories + HTML content |
| 10 | Auto OG images | Medium | ✅ generate + wire `og:image` fallback |
| 11 | Per-post JSON API | Medium | ✅ templates |
| 12 | Table of Contents | Medium | ✅ `extractHeadings` + `rehypeHeadingIds` |
| 13 | `links.json` shortcodes | Low-Med | ✅ remark plugin + case-insensitive keys |

---

## 1. Principles

1. **Engine-first.** Changes live in `src/integration/`, `src/lib/`, `src/scaffold/` — propagate via `pnpm update @vijayatech/glint`. No brand-fork logic.
2. **Zero-config where possible.** `llms-full.txt`, `article:*` meta, Organization/Person JSON-LD, sitemap `lastmod`, WebSite schema — all emit automatically from existing frontmatter + `site.config.ts`. No new config fields required.
3. **Opt-in for external credentials.** Features that need secrets stay guided CLI + gitignored paths. **Do not** treat Google Web Search Indexing API as a general blog notifier (see §2.6).
4. **Per-brand choice for policy.** AI crawler access is a brand decision: `aiCrawlers: "all" | "retrieval-only" | "none"` in `site.config.ts`.
5. **Build-time, not runtime.** Everything compiles into static output. No server needed.
6. **Doctor enforcement.** New capabilities get WARN checks so brands don't fly blind.

---

## 2. Deliverables

### 2.1 `llms-full.txt` — full-content AI surface [zero-config]

**What:** A new build-time page at `/llms-full.txt` containing the complete markdown body of every public post, concatenated with headers.

**Why:** AI engines (ChatGPT browsing, Perplexity, Claude) cite more readily when they can grab full article content in one HTTP fetch instead of crawling N pages.

**Implementation:**

- New template: `src/scaffold/theme-mounted-pages/src/pages/llms-full.txt.ts.tmpl`
- Format (follows [llmstxt.org](https://llmstxt.org) full variant):

```
# {site.brand}

> {site.seo.defaultDescription}

## {post.data.title}

URL: {canonical}
Published: {publishedAt ISO}
Updated: {updatedAt ISO}
Tags: {tags joined}

{post.body — full markdown}

---

```

- Headers: `Content-Type: text/plain; charset=utf-8`
- Exclude: drafts, future-dated, `visibility: members`
- Reference from `llms.txt`: add a line `Full content: {base}/llms-full.txt`
- Add `<link rel="alternate" type="text/plain" href=".../llms-full.txt">` to Base layout (optional, cheap)
- **Size guard:** if total body > 500KB, emit only the 50 most recent posts + a note. (Prevents runaway file for large sites.)

**Files:**
- `src/scaffold/theme-mounted-pages/src/pages/llms-full.txt.ts.tmpl` (new)
- `src/scaffold/theme-mounted-pages/src/pages/llms.txt.ts.tmpl` (add full-content link)
- `src/scaffold/theme/src/layouts/Base.astro.tmpl` (optional alternate link)

---

### 2.2 `article:*` meta tags [zero-config]

**What:** Emit Open Graph article protocol meta tags in `<head>` for every post page.

**Tags:**
```html
<meta property="article:published_time" content="{publishedAt ISO}" />
<meta property="article:modified_time" content="{updatedAt|publishedAt ISO}" />
<meta property="article:author" content="{author name or team.json url}" />
<meta property="article:tag" content="{tag1}" />
<meta property="article:tag" content="{tag2}" />
<meta property="article:section" content="{category}" />
```

**Implementation:**

- Extend `Base.astro.tmpl` Props with `articleMeta?: { publishedTime, modifiedTime, author?, tags?, section? }`
- Post template (`[slug].astro.tmpl`) passes the object from frontmatter
- Non-post pages (index, category, tag, search) don't pass it → tags omitted

**Files:**
- `src/scaffold/theme/src/layouts/Base.astro.tmpl`
- `src/scaffold/theme-mounted-pages/src/pages/[slug].astro.tmpl`

---

### 2.3 `Organization` + `Person` (author) JSON-LD [zero-config]

**What:** Emit `Organization` schema on every page (site-level entity) and `Person` schema on post pages when `author` is set.

**Organization (site-wide, in Base layout):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "{site.brand}",
  "url": "https://{site.domain}",
  "logo": "{site.baseUrl}{site.favicon or logo}",
  "sameAs": ["{site.social links if present}"]
}
```

**Person (post page, when author set):**
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "{resolved from team.json}",
  "url": "{team member url if present}"
}
```

- BlogPosting's `author` field updated to reference the Person: `"author": { "@type": "Person", "name": "..." }`

**Config source:** `data/site.config.ts` already has `brand`, `domain`, `baseUrl`, `favicon`. Add optional `social?: string[]` (array of URLs) and `logo?: string`. `data/team.json` already has person registry.

**Files:**
- `src/scaffold/theme/src/layouts/Base.astro.tmpl` (Organization in jsonLd array)
- `src/scaffold/theme-mounted-pages/src/pages/[slug].astro.tmpl` (Person + author ref)
- `src/cli/commands/new.ts` (scaffold `social` + `logo` fields in site.config)

---

### 2.4 `FAQPage` + `HowTo` JSON-LD [opt-in per post]

**What:** When a post's frontmatter contains structured FAQ or HowTo data, emit the corresponding JSON-LD.

**Schema addition (optional fields on blog schema):**

```ts
faq: z.array(z.object({
  q: z.string(),
  a: z.string(),
})).optional(),

howTo: z.object({
  name: z.string(),
  steps: z.array(z.object({
    name: z.string(),
    text: z.string(),
    url: z.string().optional(),
  })),
  totalTime: z.string().optional(), // ISO 8601 duration
}).optional(),
```

**Build behavior:**
- If `faq` present → emit `FAQPage` JSON-LD alongside BlogPosting
- If `howTo` present → emit `HowTo` JSON-LD
- Doctor: no WARN (these are optional enrichments)
- Agent pipeline: `/draft` command can auto-suggest FAQ from content headings that end with `?`

**Files:**
- `src/content/schema.ts` (add optional `faq`, `howTo` to base)
- `src/scaffold/theme-mounted-pages/src/pages/[slug].astro.tmpl` (emit JSON-LD)

---

### 2.5 Sitemap `lastmod` [zero-config]

**What:** Include `<lastmod>` in sitemap URLs so Google/Bing prioritize re-crawling updated posts.

**Implementation:**

- Astro's `@astrojs/sitemap` supports `lastmod` via the `serialize` hook or by providing `lastmod` in the item data.
- Approach: configure `@astrojs/sitemap` in the scaffolded `astro.config.ts` with a `serialize` function that reads `updatedAt ?? publishedAt` from the content collection.
- Alternative (simpler): post-build integration that patches sitemap XML to inject `<lastmod>` from a manifest built during `astro:build:done`.

**Preferred:** Post-build integration `glintSitemapLastmod()` in `src/integration/sitemap.ts`:
1. On `astro:build:done`, read all content files' `updatedAt ?? publishedAt`
2. Map slug → lastmod ISO date
3. Patch existing sitemap XML: inject `<lastmod>` into each `<url>` that matches

**Files:**
- `src/integration/sitemap.ts` (extend or new function)
- Scaffolded `astro.config.ts` template (register integration)

---

### 2.6 Google Indexing API — `glint index` [BLOCKED for blogs]

**Status:** 🔴 **Do not brand-roll.** WIP code exists (`glint index`, `glint setup indexing`, doctor WARN) but the product framing was wrong.

**What Google actually allows:** The [Web Search Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart) is for pages with **`JobPosting`** or **`BroadcastEvent`** (embedded in `VideoObject`) structured data only — not general BlogPosting / article URLs. Auth success does **not** mean blog posts will be crawled or ranked via this API.

**What we should do instead for Google discovery:**
- Submit **`sitemap-index.xml`** in GSC (organic plan 2a)
- Sitemap `<lastmod>` once mount paths are fixed (2.5)
- URL Inspection on top posts
- Content quality + freshness (organic WS3)
- IndexNow remains Bing/Yandex/Naver only (never Google)

**If code is kept in-tree (short term):**
1. Doctor should **not** WARN brands to configure Indexing for blogs.
2. CLI should refuse or hard-warn when content is BlogPosting-only.
3. Setup guide must not recommend GCP project Owner IAM; GSC property Owner for the SA email is the relevant ownership step (only if ever used for supported types).
4. Prefer removal from scaffold/doctor until a supported content type exists in Glint.

**Prior incorrect claim (struck):** “Google is 90% of search → Indexing API is high-impact for Glint blogs.”

---

### 2.7 Per-brand AI crawler policy in robots.txt [config-driven]

**What:** `site.config.ts` gets an `aiCrawlers` toggle that controls explicit bot directives in `robots.txt`.

**Config:**
```ts
aiCrawlers: "all" | "retrieval-only" | "none",  // default: "all"
```

**Bot classification:**
| Policy | Allowed | Blocked |
|--------|---------|---------|
| `all` | All bots (User-agent: *) | None |
| `retrieval-only` | ChatGPT-User, Perplexity-User, ClaudeBot, OAI-SearchBot, Googlebot, Bingbot | GPTBot, CCBot, Google-Extended, ClaudeBot-Training (explicit Disallow) |
| `none` | Googlebot, Bingbot (search only) | All AI-specific bots |

**robots.txt output (example for `retrieval-only`):**
```
User-agent: *
Allow: /

# AI retrieval bots (can surface your content in answers)
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: ClaudeBot
Allow: /

# AI training-only bots (blocked)
User-agent: GPTBot
Disallow: /
User-agent: CCBot
Disallow: /
User-agent: Google-Extended
Disallow: /

Sitemap: {sitemap URL}
```

**Doctor:** WARN if `aiCrawlers` is unset (default to `"all"` but nudge explicit choice).

**Files:**
- `src/scaffold/theme-mounted-pages/src/pages/robots.txt.ts.tmpl`
- `src/scaffold/theme/src/pages/robots.txt.ts.tmpl`
- `src/cli/commands/new.ts` (scaffold field)
- `src/cli/commands/doctor.ts` (WARN)

---

### 2.8 `WebSite` JSON-LD with `SearchAction` [zero-config]

**What:** Emit on the blog index page — tells Google about site structure + enables sitelinks search.

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "{site.brand}",
  "url": "https://{site.domain}",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "{base}search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

**Files:**
- `src/scaffold/theme-mounted-pages/src/pages/index.astro.tmpl` (add jsonLd prop)

---

### 2.9 RSS enrichment [zero-config]

**What:** Add `content:encoded` (full HTML body), `author`, `category`, and `dc:creator` to RSS items.

**Implementation:**
- `@astrojs/rss` supports `content` field per item (maps to `content:encoded`)
- Add `author` from `post.data.author` resolved via team.json
- Add `categories` from `post.data.tags`

**Files:**
- `src/scaffold/theme-mounted-pages/src/pages/rss.xml.js.tmpl`

---

### 2.10 Auto OG images [build-time, zero-config per post]

**What:** Generate a unique OG image per post at build time using `astro-og-canvas` (or `satori`). Falls back to a site-level default when no cover image.

**Implementation:**
- Add `astro-og-canvas` as engine dependency
- Create `src/scaffold/theme-mounted-pages/src/pages/og/[slug].png.ts.tmpl` — generates a canvas with post title, brand name, date, cover image if present
- Post template: `og:image` → `/og/{slug}.png` (auto, no frontmatter needed)
- Fallback: `/og/default.png` for index/category/tag pages

**Files:**
- `src/scaffold/theme-mounted-pages/src/pages/og/[slug].png.ts.tmpl` (new)
- `src/scaffold/theme-mounted-pages/src/pages/[slug].astro.tmpl` (og:image URL)
- `src/scaffold/theme/src/layouts/Base.astro.tmpl` (default og:image)
- `package.json` (add `astro-og-canvas` dep)

---

### 2.11 Per-post JSON API [zero-config]

**What:** `/api/blog/<slug>.json` — structured single-post endpoint for apps + AI agents.

**Response shape:**
```json
{
  "slug": "...",
  "url": "https://...",
  "title": "...",
  "summary": "...",
  "publishedAt": "...",
  "updatedAt": "...",
  "author": { "name": "...", "url": "..." },
  "category": "...",
  "tags": [],
  "cover": { "src": "...", "alt": "..." },
  "body": "full markdown",
  "readingTime": 5,
  "related": [{ "slug": "...", "title": "...", "url": "..." }]
}
```

**Files:**
- `src/scaffold/theme-mounted-pages/src/pages/api/blog/[slug].json.ts.tmpl` (new)

---

### 2.12 Table of Contents [zero-config]

**What:** Auto-generate a TOC from `h2`/`h3` headings in post body. Rendered as a nav element with anchor links. Enables SERP jump links.

**Implementation:**
- Utility in `src/lib/content.ts`: `extractHeadings(markdown): { depth, text, id }[]`
- Post template: render `<nav class="toc">` before `<Content />`
- Slugify heading text for anchor IDs
- Astro rehype plugin (or remark plugin) to inject `id` attributes on headings

**Files:**
- `src/lib/content.ts` (add `extractHeadings`)
- `src/scaffold/theme-mounted-pages/src/pages/[slug].astro.tmpl` (render TOC)
- Scaffolded `astro.config.ts` (rehype-slug or custom plugin)

---

### 2.13 `links.json` registry resolution [build-time]

**What:** Resolve `<Cta id="..." />` and `<Ref to="..." />` MDX components from `data/links.json` at build time. Enables single-file CTA/link updates across all posts.

**Implementation:**
- MDX components: `Cta` renders an `<a>` with URL + label from links.json
- `Ref` renders an inline link reference
- Build reads `data/links.json` → passes to MDX component context
- Doctor: WARN on broken link IDs referenced in content but not in links.json

**Files:**
- `src/scaffold/theme/src/components/Cta.astro` (new)
- `src/scaffold/theme/src/components/Ref.astro` (new)
- `src/cli/commands/doctor.ts` (link ID validation)
- MDX integration in scaffolded astro.config

**Note:** Requires MDX support. Posts using plain `.md` can use a shortcode syntax `{{cta:demo}}` resolved by a remark plugin.

---

## 3. Doctor additions

New WARNs (non-breaking):

| Check | Condition | Notes |
|-------|-----------|--------|
| `googleIndexing.serviceAccountKey` empty | Published posts exist | **Remove or invert** — do not push blogs to configure Indexing API |
| `aiCrawlers` not explicitly set | Any published posts | Keep; scaffold default `"all"` currently skips this |
| `social` links empty in site.config | Published posts (missed entity signals) | Keep |
| No `faq` on posts > 1500 words | Informational only (agent hint) | Not implemented yet |

---

## 4. Implementation sequence

| Phase | Items | Rationale | Status |
|-------|-------|-----------|--------|
| **P0 — AEO emitters** | 2.1, 2.2, 2.3, 2.5, 2.8 | Zero-config, pure engine | ✅ done |
| **P1 — AI policy + feeds** | 2.7, 2.9, 2.11 | Config-driven | ✅ done |
| **P2 — Google Indexing** | 2.6 | **Gated for blogs** | ✅ refuse without `--force` |
| **P3 — Rich content** | 2.4, 2.10, 2.12 | Schema + OG + TOC | ✅ done |
| **P4 — Internal linking** | 2.13 | remark shortcodes | ✅ done |
| **Gate before release** | TOC ids, OG meta, lastmod, Indexing gate, tests | Engine gate green 2026-07-23 | ✅ |

---

## 5. Config additions to `site.config.ts` (scaffolded by `glint new`)

```ts
// AI crawler access policy for robots.txt
aiCrawlers: "all" as "all" | "retrieval-only" | "none",

// Social/entity links for Organization JSON-LD sameAs
social: [] as string[],

// Optional logo URL (falls back to favicon)
logo: "",

// Google Indexing — do not scaffold for blogs until product decision reverts/gates 2.6
// googleIndexing: { serviceAccountKey: "" },  // BLOCKED for BlogPosting
```

---

## 6. Out of scope

- Hosted Glint cloud proxy for Google Indexing API (violates files-own philosophy)
- **Using Google Web Search Indexing API for general blog/article URLs** (API does not support BlogPosting)
- `hreflang` / multilingual (single-language blogs for now)
- Automatic FAQ extraction from content (agent pipeline concern, not engine)
- `llms.txt` `llms:` field in robots.txt (per ORGANIC-GROWTH-PLAN §7: deliberately not doing)
- Claiming any of these guarantee AI citations or rankings
- Brand measurement (GSC/GA/Looker) — owned by ORGANIC-GROWTH-PLAN WS1–2, not this uplift

---

## 7. Success criteria

**Must pass before package release to brands:**

- [x] Playground registers `glintSitemapLastmod()` + mount-aware matching helpers/tests
- [x] TOC links resolve to real heading `id`s (`rehypeHeadingIds` + `extractHeadings`)
- [x] OG wired into `og:image` (cover or `/og/{slug}.svg` from `glintOgImage`)
- [x] Google Indexing hard-gated (`glint index` needs `--force`); setup guide warns; doctor does not push blogs
- [x] `pnpm test` covers lastmod, remark-links, extractHeadings / markdownToHtmlBasic

**Completed follow-ups:**

- [x] Schema `faq` / `howTo` + JSON-LD emission when present
- [x] `article:*` meta in post templates
- [x] Organization JSON-LD (`site.logo || site.favicon`)
- [x] WebSite JSON-LD on index
- [x] robots `aiCrawlers` three modes in templates
- [x] `llms-full.txt` template with size guard
- [x] Per-post JSON API templates
- [x] Person author resolved from `team.json` (case-insensitive id)
- [x] RSS HTML `content` via `markdownToHtmlBasic`
- [x] links.json key case normalization
- [x] Unit tests for pure helpers

**Explicitly not a success criterion:** `glint index` brand rollout for blogs.  
**Brand follow-up:** existing brand layouts need package update + layout refresh for new helpers.

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| `llms-full.txt` too large for big sites | 500KB cap mid-stream (posts already newest-first via `publicPosts`) |
| Marketing Google Indexing for blogs | **Blocked** — API scope JobPosting/BroadcastEvent only; gate/remove CLI |
| OG SVG only / wrong resvg API | Wire meta tags; fix or drop PNG path; verify social crawlers |
| TOC dead anchors | rehype-slug + shared `extractHeadings` |
| lastmod silent no-op on mounts | Prefix base / flat slug paths; fixture test |
| Brand layout drift | Templates only; existing brands need PR after package update |
| Overclaiming AI citation effects | Docs + code comments: eligibility, not guarantee |
| Engine work displacing brand measurement | Organic plan §10: brand 1f/2a–2c remains Week-1 priority |

---

## 9. Decision log

| Decision | Choice | Why |
|----------|--------|-----|
| llms-full.txt vs per-post only | Full file + per-post twins | One-fetch for AI engines; cheap to emit |
| Google Indexing for blogs | **Do not use / do not brand-roll** | Official API limited to JobPosting / BroadcastEvent |
| AI crawler policy | Per-brand config (3 modes) | Brands have different stances on training |
| FAQ/HowTo trigger | Explicit frontmatter | Zero-config would require NLP; explicit is reliable |
| OG images | Build-time SVG (+ optional PNG); must wire meta | Plan originally said astro-og-canvas; current path incomplete |
| Sitemap lastmod | Post-build XML patch | Works regardless of Astro sitemap plugin version |
| TOC | Heading IDs + nav (IDs still missing) | Standard, accessible, SERP jump links |
| links.json | Remark shortcodes first (not MDX-only) | Supports plain `.md` authors |

---

## 10. Review (2026-07-22)

Review of this plan vs local engine implementation and parent plan `docs/ORGANIC-GROWTH-PLAN.md`. Parent plan §12 holds the growth-system view; this section is the uplift-specific record.

### 10.1 Verdict

**Do not mark implemented.** Large, useful engine surface is in the tree, but release is blocked by incorrect Google Indexing product framing, unwired OG, dead TOC anchors, and lastmod/playground gaps. Parent organic plan Week-1 work (brand instrumentation + GSC/Bing/GA) is **not** advanced by this PR and remains higher ROI for “visible results.”

### 10.2 Plan quality

| Good | Bad |
|------|-----|
| Zero-config vs credential opt-in split | Status was over-claimed as “implemented” |
| Respects organic §7 (no robots `llms:`) | §2.6 Google Indexing impact ranked High for blogs — **factually wrong** |
| Doctor enforcement intent | Success criteria unchecked while status said done |
| Out-of-scope honesty on citations | Did not say brand measurement is out of scope (implied competition with organic sequencing) |

### 10.3 Implementation vs plan (bugs)

1. **Google Indexing API** — code + setup + doctor encourage blog use; Google docs limit to JobPosting/BroadcastEvent. **Block brand rollout.**  
2. **TOC** — nav without heading `id` injection.  
3. **OG** — files written under `og/`; post templates still only pass cover to Base; resvg call shape wrong.  
4. **Playground** — missing `glintSitemapLastmod()`.  
5. **lastmod paths** — no Astro `base` / flat mounted slug keys.

### 10.4 Implementation vs plan (suggestions)

6. Setup IAM copy (GSC Owner vs GCP project Owner).  
7. Org logo: `site.logo || site.favicon`.  
8. Person from `team.json`.  
9. `links.json` key lowercasing on load.  
10. RSS HTML content.  
11. Reuse `extractHeadings` in templates.  
12. Unit tests for pure helpers.  
13. Soften “maximises citation” language.  
14. Scaffold default `aiCrawlers: "all"` skips doctor “conscious choice” WARN.

### 10.5 Relationship to organic growth plan

This uplift is **engine-only**. It does **not** close ORGANIC-GROWTH-PLAN brand board, WS2 measurement, or 1h CF audit. Treat as optional acceleration of WS3/entity/AI surfaces **after** (or parallel to, never instead of) brand instrumentation.

### 10.6 Next actions (ordered)

1. Gate/remove Google Indexing for BlogPosting; stop doctor WARN for empty key on blog sites.  
2. Fix TOC heading ids + use `extractHeadings`.  
3. Wire OG into meta or drop from default integrations.  
4. Fix lastmod mount matching; register in playground; add fixture test.  
5. Address Person / logo / links casing as follow-ups.  
6. Only then: release package; brands update layouts/config per organic §1f.
