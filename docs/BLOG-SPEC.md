# Glint Blog Spec — the SEO/AEO content framework

Glint is a **fluid SEO & AEO content framework**: you (or an agent) write
Markdown to a fixed contract, and the build *automatically* emits everything an
answer engine and a search engine need — structured data, twins, feeds, internal
links, search — with no per-post SEO busywork. This file is the **definition of
done** for `glint build` / `doctor` / `status`.

Decisions consolidated here were made 2026-06-02.

---

## UI & brand blend (positioning)

Glint ships **one** opinionated, reading-optimized layout and blends with each
brand via **tokens, not per-site theming** (the Superblog model). The blog must
feel like part of the app — never a separate product.

- **Tokens** (`public/theme.css`): colors, fonts, radius — extracted from the app
  at onboarding so the blog inherits the brand's palette + type.
- **Chrome**: a simple, **static** header (logo + nav) and footer, rendered by
  Glint and styled by tokens; links come from `site.config.ts`. No app runtime,
  no auth state.
- **Escape hatch**: `public/custom.css` for brand-specific overrides.
- **Auth/gating**: OFF by default; opt-in edge check only for the rare gated brand.
- **Non-goals**: page builders, multiple themes, heavy layout customization,
  publishing-house workflows. Glint is for small teams — speed, simplicity, SEO/AEO.

---

## 1. Content states (status model)

**Git-native, not folders.** All posts of a collection live in one flat folder
(`content/<collection>/*.md`) so URLs are stable regardless of status.

| State | Represented by | In production |
|---|---|---|
| **Draft** | `draft: true` | **Not built → 404.** Excluded from index, archives, sitemap, RSS, search, twins. |
| **Pending review** | an **open Pull Request** | n/a — visible only via the PR's preview deploy |
| **Scheduled** | `draft: false` + future `publishedAt` | Not built until the date; a daily CI rebuild flips it live |
| **Published** | `draft: false`, `publishedAt` ≤ now | Live, indexed, listed |

**Draft visibility:** drafts are dark in production (404, `noindex`, unlisted), but
the build **includes** them in `astro dev` and in **per-PR preview deploys** (with a
`DRAFT` banner + `noindex`) so reviewers can read them at a temporary URL. That
preview URL is the static equivalent of WordPress's "preview draft" — tied to the
PR (the review gate), not a login.

**No status sub-folders** (they leak into URLs and duplicate git). The "see &
manage" view is `glint status` (a board) + open PRs (the review queue).

## 2. Taxonomy — category + tags, from a registry

- **`category`** — one primary, broad section per post.
- **`tags`** — many granular labels.
- Both are a **controlled vocabulary** managed in human-editable registries:
  - `data/categories.md` — `## Name` + `slug:` + description per category.
  - `data/tags.md` — `- slug — description` per tag.
- **`glint doctor`** warns when a post uses a `category`/`tag` not in the registry
  (kills sprawl: no "AI" vs "ai" vs "artificial-intelligence").
- **Build** generates `/<collection>/category/<slug>` and `/<collection>/tag/<slug>`
  archive pages, using the registry descriptions as real on-page SEO/AEO copy.

## 3. Metadata contract

Per post (full schema in `src/content/schema.ts`):
`title`, `summary` (= meta description), `publishedAt`, `updatedAt?`, `category?`,
`tags[]`, `author?` (→ `data/team.json` → author page), `cover{src,alt}`,
`images[]`, `visibility` (public|gated|members), `draft`.

## 4. SEO/AEO surface (auto-emitted by the build)

For every published post + listing, the build emits — with **no manual work**:

- **JSON-LD / schema.org:** `BlogPosting`/`Article`, `BreadcrumbList`,
  `Organization`, and `Person` (author).
- **`llms.txt`** — index of canonical URLs + raw twin links for AI crawlers.
- **Markdown twins** — `/raw/<collection>/<slug>.md` (the source, served clean).
- **`sitemap.xml`** + **RSS/Atom feed** (`feed.xml`).
- **Canonical URLs**, OpenGraph + Twitter meta, and **auto-generated per-post OG
  images** (satori / astro-og-canvas).
- **JSON content API** — `/api/<collection>.json` + `/api/<collection>/<slug>.json`
  for apps/mobile consumers.
- Per-post: **breadcrumbs, reading time, table of contents, related posts**.

Drafts/scheduled posts are excluded from all of the above until live.

## 5. Internal linking

- **`data/links.json`** — registry of canonical/shared URLs + CTAs; referenced in
  content and resolved at build (change once → every post updates).
- **Link graph + related posts** computed from `category`/`tags` at build.
- **Broken-link checker** in `glint doctor` (fails the build on dead internal links).
- Slug renames must keep a `redirects.json` entry — never break a live URL.

## 6. Search — Pagefind

Static, build-time search index, runs fully in the browser, zero server — ideal
for a CDN-hosted site. Drafts are excluded from the index.

## 7. Analytics — Cloudflare Web Analytics

Privacy-friendly, cookieless, free, and native to the CF layer already in front of
the site. (Self-hosted Umami on the Coolify VPS is the alternative.)

## 8. Out of scope (for now)

- **Comments** — none (Giscus/GitHub Discussions can be added later).
- **Status sub-folders**, CMS admin UI — explicitly rejected (see §1 and ARCHITECTURE).

## 9. Definition of done

- `glint status` — content board (✅ implemented).
- `glint doctor` — schema + scaffolding + taxonomy-registry + dup-slug +
  broken-internal-link validation + onboarding-placeholder warnings (unfilled
  strategy/voice/taxonomy); fails (exit 1) on any ERROR (✅ implemented).
- `glint build` — Astro static build honoring §1 draft rules (✅ v1: HTML +
  `BlogPosting` JSON-LD + canonical/OG + sitemap + RSS + `llms.txt` + `/raw` twins
  + `/api/blog.json` + reading time). **v2:** category/tag archives, related posts,
  Pagefind search, auto OG images, per-post JSON, internal-link registry.
- `glint preview` — Astro dev with drafts visible + `noindex` banner (✅).
- Reference implementation + dogfood: `examples/playground/` (a buildable Glint site).
