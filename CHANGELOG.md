# Changelog

All notable changes to this project will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **sync**: `glint sync [--dry-run]` — pulls latest engine templates into a brand
  site safely. Three-bucket model: overwrites engine-reference docs, regenerates
  engine-generated files (AGENTS.md, review checklist, agent rules) from current
  `data/site.config.ts`, and never touches brand-owned files (voice, categories,
  strategy, theme, content). Existing sites update with `pnpm update @vijayatech/glint
  && pnpm glint sync`.
- **content**: Brand-aware `docs/blog-review-checklist.md` generated at `glint new`
  and kept current by `glint sync`. Covers SEO/AEO fundamentals — internal linking,
  dedup, staggered publish dates, keyword targeting, CTA — with `[doctor]`/`[human]`
  tags so reviewers spend attention on judgment calls, not machine-checkable rules.
- **scaffold/AGENTS.md**: "Running / Updating / Leaving Glint" sections documenting
  `pnpm glint <cmd>` invocation, the two-step update path, and the clean exit path
  (portable Markdown — no lock-in).
- **docs**: `docs/DECISIONS.md` — append-only ADR log (promoted from ARCHITECTURE.md
  §12 and extended with 2026-06-04 decisions). `CONTRIBUTING.md` — states changelog
  and maintenance rules so the discipline is self-documenting.

### Changed
- **scaffold/AGENTS.md**: Hard rules updated — stagger publish dates, no duplicate
  posts, self-review against checklist before PR. All bare `glint` CLI invocations
  corrected to `pnpm glint` throughout.
- **docs/ARCHITECTURE.md**: §12 (Decisions) replaced with a pointer to
  `docs/DECISIONS.md`. Roadmap (§11) remains canonical — README now links there
  instead of duplicating the phase list.
- **README**: Roadmap section replaced with a two-line summary linking to
  `docs/ARCHITECTURE.md §11`. `sync` added to the CLI command list.

### Fixed
- **scaffold/package.json**: New brand sites now scaffold with `"glint": "glint"` in
  `scripts`, so `pnpm glint <cmd>` works from the repo root — no global install
  required. Eliminates the recurring `glint: command not found` error.

---

## [0.1.0] — 2026-06-04

Initial release. Blog engine complete end-to-end.

### Added
- **content**: Content strategy layer — strategy, plan, playbook, and agent workflow.
- **doctor**: Pre-merge quality gate with schema validation, taxonomy-registry
  enforcement, broken-link checking, duplicate-slug detection, and unfilled
  onboarding-placeholder warnings.
- **docs**: Getting Started, Architecture, Agent Guide, Blog Spec, Init, Feedback,
  and concept documents.
- **engine**: Core content contract (Zod schema), CLI system, and tsup build.
- **feedback**: Structured feedback pipeline for the read-only engine loop.
- **import**: WordPress → Glint importer (`glint import wordpress --wxr <file>`).
- **init/new**: State-aware init system (`glint init`, `glint new`) scaffolding a
  buildable, brand-aware Astro site with agent files, taxonomy, and theme.
- **onboard**: `glint onboard --app <repo> --apply` — detect brand/tokens/host and
  scaffold in one command.
- **seo**: `robots.txt`, `BreadcrumbList` JSON-LD, canonical/OG meta, auto-sitemap,
  RSS/Atom, `llms.txt`, `/raw` Markdown twins, JSON content API.
- **theme**: Token-styled static header/footer; `glint theme pull` extracts brand
  tokens; category/tag archives; related posts; Pagefind search.

### Changed
- **build**: Configured as a publish-ready package (tsup, importable schema export,
  installable bin).
- **docs**: Layer 3 made host-agnostic; product model locked (capture-once
  onboarding, token-blend, no CMS).

### Fixed
- **feedback**: Engine version from built `dist/` was showing as "unknown".
