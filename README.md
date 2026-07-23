# Glint

> Open-source, **git-native** publishing for the AI era.
> **Static-output · agent-first · IDE-friendly · SEO/AEO-native.**
>
> A **fluid SEO & AEO content framework**: write Markdown to a fixed contract; the
> build auto-emits structured data, markdown twins, `llms.txt`, feeds, internal
> links, and search — no per-post SEO busywork.

**Glint** helps **developers, freelancers, and agencies** publish rich content and
manage blogs **in context** with the website, app, or product they already ship —
without leaving the IDE, without a separate CMS runtime, and without abandoning
git.

Content is **Markdown + JSON in git**; an **AI agent authors** from inside the
repo (with brand, product, and prior-post context); **humans approve by reviewing
a PR**; output is **pure static HTML + a JSON/MD content API**. WordPress-grade
media and reuse, none of the runtime.

It is deliberately **not a CMS**. It is a thin content contract + agent
publishing loop + static build, assembled on Astro and deployable to any host.

## Who Glint is for (and not)

**For:**

- **Developers** who want a blog or content surface next to the app they build
- **Freelancers** who deliver content sites without babysitting a hosted CMS
- **Agencies** standardizing many brand blogs on one engine and one git workflow
- Small teams who want SEO/AEO-strong, brand-matched blogs published by agents
  with light human review

**Not for:** heavy per-site page builders, theme marketplaces, or
publishing-house workflows that need a non-technical admin UI first. Glint ships
**one** opinionated, reading-optimized layout and matches your brand via
**tokens** — not custom themes.

> Design rule: the blog must feel like part of your product — same colors, type,
> and a simple matching header/footer — **never a separate product** — while
> staying fully static for SEO/AEO.

## Status

**v1: Blog engine — complete end-to-end.** CLI: `onboard · init · new · sync · status · doctor ·
import · build · preview · feedback · theme`.

- **Onboard any brand in one command** — `glint onboard --app <repo> --apply`
  detects brand/tokens/host and scaffolds a buildable, brand-matched blog.
- **Static + AEO** — JSON-LD, sitemap, RSS, `robots.txt`, `llms.txt`, `/raw`
  markdown twins (AEO headers), JSON API; category/tag **archives**, **related
  posts**, and **Pagefind search**; drafts excluded from production. See
  [`docs/AEO.md`](docs/AEO.md).
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
- [`docs/AEO.md`](docs/AEO.md) — static AEO surface vs optional edge (human approval).
- [`docs/UPGRADE.md`](docs/UPGRADE.md) — brand upgrade checklist (humans + agents).
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
