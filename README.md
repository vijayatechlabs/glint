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

**v1: Blog engine — complete end-to-end.** CLI: `onboard · init · new · sync · status · doctor ·
import · build · preview · feedback · theme`.

- **Onboard any brand in one command** — `glint onboard --app <repo> --apply`
  detects brand/tokens/host and scaffolds a buildable, brand-matched blog.
- **Static + AEO** — JSON-LD, sitemap, RSS, `robots.txt`, `llms.txt`, `/raw`
  markdown twins, JSON API; category/tag **archives**, **related posts**, and
  **Pagefind search**; drafts excluded from production.
- **Brand blend** — token-styled static header/footer; `glint theme pull` pulls an
  app's Tailwind/CSS tokens into `theme.css`; `custom.css` escape hatch.
- **Mount-correct** — assets use absolute URLs from `site.baseUrl` so the blog
  loads correctly when proxied at `domain.com/blog`. Logo links to the main domain.
- **`doctor` is the real gate** — broken internal links are errors; published posts
  linking to drafts are flagged; unfilled brand voice/strategy blocks publishing.
- **Packaged** — builds with tsup to `dist/`; importable
  (`import { blog } from "@vijayatech/glint/schema"`) and installable as a git
  dependency. Brand repos import the engine schema directly — no manual sync.

**Non-blog collections** (`events`, `profiles`, `case-studies`, `news`): Zod schemas
are done and `glint doctor` validates them. Page rendering (routes, RSS, JSON API)
is **Phase 2**. Running `glint new --collections events` will warn clearly.

See `examples/playground/` for a buildable reference site, `docs/FEEDBACK.md` for
the read-only-engine feedback loop.

Layout: this repo is the engine package (`@vijayatech/glint`). Each brand site is
a separate repo, onboarded from the engine.

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
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — append-only ADR log (why, not what).
- [`docs/AGENT-GUIDE.md`](docs/AGENT-GUIDE.md) — the agent-agnostic operating contract.
- [`docs/INIT.md`](docs/INIT.md) — the state-aware init system (fresh/migration/adopt/established).
- [`docs/BLOG-SPEC.md`](docs/BLOG-SPEC.md) — the SEO/AEO content spec + definition of done.
- [`docs/concept.md`](docs/concept.md) — original brainstorm that seeded the design.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — changelog discipline + maintenance rules.

## Roadmap

Phase 0 (engine + naam.one migration) → Phase 1 (agent loop) → Phase 2 (content
API + multi-collection) → Phase 3 (multi-brand scale) → Phase 4 (client dashboard).

Full roadmap with exit criteria: [`docs/ARCHITECTURE.md §11`](docs/ARCHITECTURE.md).

---

© VijayaTech Labs.
