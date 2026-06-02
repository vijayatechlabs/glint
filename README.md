# Glint

> The lightning publishing engine for the AI era.
> **Git-native · static-output · agent-first · edge-delivered · AEO-native.**

Glint is a reusable publishing engine for VijayaTech's own and client brands.
Content is **Markdown + JSON in git**; an **AI agent authors** from inside the
repo; **humans approve by reviewing a PR**; output is **pure static HTML + a
JSON/MD content API**. WordPress-grade media and reuse, none of the runtime.

It is deliberately **not a CMS**. It is a thin content contract + agent
publishing loop + static build, assembled on Astro + a self-hosted VPS.

## Status

**Design locked → Phase 0 (engine scaffold + naam.one WordPress migration).**
This repo currently holds the design docs; engine code lands in Phase 0.

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

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the source of truth (layers, contract, roadmap, decisions).
- [`docs/concept.md`](docs/concept.md) — original brainstorm that seeded the design.

## Roadmap

- **Phase 0** — engine skeleton + migrate **naam.one** off WordPress, deploy on Coolify.
- **Phase 1** — agent publishing loop (draft → file → PR → deploy).
- **Phase 2** — content API + gated tier + `/blog` mount onto apps.
- **Phase 3** — MinIO media + multi-brand cloning + AEO polish.
- **Phase 4** — optional non-technical client dashboard tier.

---

© VijayaTech Labs.
