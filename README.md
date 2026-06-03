# Glint

> The lightning publishing engine for the AI era.
> **Git-native · static-output · agent-first · edge-delivered · AEO-native.**
>
> A **fluid SEO & AEO content framework**: write Markdown to a fixed contract; the
> build auto-emits structured data, markdown twins, `llms.txt`, feeds, internal
> links, and search — no per-post SEO busywork.

Glint is a reusable publishing engine for VijayaTech's own and client brands.
Content is **Markdown + JSON in git**; an **AI agent authors** from inside the
repo; **humans approve by reviewing a PR**; output is **pure static HTML + a
JSON/MD content API**. WordPress-grade media and reuse, none of the runtime.

It is deliberately **not a CMS**. It is a thin content contract + agent
publishing loop + static build, assembled on Astro and deployable to any host.

## Who Glint is for (and not)

**For:** small teams and solo founders who want fast, SEO/AEO-strong blogs that
**blend into their existing brand/app**, published by AI agents with light human
review. Speed, simplicity, agent-first.

**Not for:** heavy per-site customization, page builders, theme marketplaces, or
publishing-house workflows. Glint ships **one** opinionated, reading-optimized
layout and matches your brand via **tokens** — not custom themes.

> Design rule: the blog must feel like part of your app — same colors, type, and a
> simple matching header/footer — **never a separate product** — while staying
> fully static for SEO/AEO.

## Status

**Engine working end-to-end.** CLI: `init` · `new` · `status` · `doctor` ·
`import wordpress` · **`build`** · **`preview`**. The Astro rendering layer (v1)
produces a static site with the AEO surface — JSON-LD, sitemap, RSS, `llms.txt`,
`/raw` markdown twins, JSON API — with drafts excluded from production. See
`examples/playground/` for a buildable reference site.

**v2 (next):** category/tag archives, related posts, Pagefind search, auto OG
images, internal-link registry, then publishing the schema for cross-package reuse.

Layout: this repo is the engine package (`@vijayatech/glint`). Each brand site is
a separate repo that installs the engine.

## Confirmed stack (2026-06-02)

| Concern | Choice |
|---|---|
| Static builder | Astro (static output) |
| Content | Markdown + frontmatter, Zod-validated |
| Host / PaaS | Hostinger VPS + Coolify (Docker + Traefik) |
| CDN (front, optional) | Cloudflare free plan |
| Media | MinIO (S3-compatible) |
| CI/CD | GitHub Actions (validate) + Coolify (deploy) |
| Agent | Claude Code skill + MCP (git/GitHub) |

## Docs

- [`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md) — **start here** — how to begin in Claude / Gemini-Antigravity / Codex, for any project state.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layers, contract, roadmap, decisions.
- [`docs/AGENT-GUIDE.md`](docs/AGENT-GUIDE.md) — the agent-agnostic operating contract.
- [`docs/INIT.md`](docs/INIT.md) — the state-aware init system (fresh/migration/adopt/established).
- [`docs/BLOG-SPEC.md`](docs/BLOG-SPEC.md) — the SEO/AEO content spec + definition of done.
- [`docs/concept.md`](docs/concept.md) — original brainstorm that seeded the design.

## Roadmap

- **Phase 0** — engine skeleton + migrate **naam.one** off WordPress, deploy on Coolify.
- **Phase 1** — agent publishing loop (draft → file → PR → deploy).
- **Phase 2** — content API + gated tier + `/blog` mount onto apps.
- **Phase 3** — MinIO media + multi-brand cloning + AEO polish.
- **Phase 4** — optional non-technical client dashboard tier.

---

© VijayaTech Labs.
