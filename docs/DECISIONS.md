# Decisions

Append-only log of architectural and product decisions. Each entry states the
choice, why it was made, and any constraints that might make you revisit it.
Add a dated entry whenever you make a call that isn't obvious from the code.

Never edit past entries — if a decision changes, add a new entry referencing it.

---

## 2026-06-02

**Decision 1 — Name: Glint**
Chosen. Sanskrit-family alternates (Tejas, Vidyut) remain available; swap is
a global find-replace.

**Decision 2 — Framework: Astro (static output)**
Static-first by default; Node adapter available for the gated-content edge layer.
Revisit only if a brand requires server-side rendering beyond the thin gating layer.

**Decision 3 — Host: agnostic**
Static `dist/` deploys anywhere. Default Cloudflare Pages; also Vercel / Netlify /
VPS+Coolify per-brand via `deployTarget` in `data/site.config.ts`.

**Decision 4 — Pilot: naam.one (WordPress migration)**
First real brand. Validates the WP importer, `glint doctor` gate, and Coolify deploy
before opening to other brands.

**Decision 5 — Client dashboard tier: deferred to Phase 4**
Non-technical editors (EmDash or equivalent) are out of scope until Phase 3 is live
(2+ brands proven). The agent+PR flow is the v1 publishing UX.

### Infra sub-decisions (Hostinger VPS + Coolify default)

| Question | Choice | Note |
|---|---|---|
| Cloudflare CDN | Yes | Global cache + TLS + DDoS mitigation, free tier. |
| Media storage | MinIO on VPS | S3 API — swap to Bunny/R2 later without content changes. |
| Build & deploy | Coolify git-deploy + GH Actions for `glint doctor` | Merge to `main` → Coolify builds & deploys. |
| Dynamic layer | Astro Node adapter container | Thin service for gating/forms/IndexNow; everything else static. |

---

## 2026-06-04

**Decision 6 — `glint sync` three-bucket model**
Engine-managed files split into: (1) engine-reference (static docs, always
overwrite), (2) engine-generated (templates interpolated from brand config,
always regenerate), (3) brand-owned (voice, categories, strategy, theme, content —
never touched). Regenerating bucket 2 silently is safe because the brand's real
data lives in bucket 3, not in the generated files.
Alternative considered: interactive prompts per file. Rejected — defeats the
1-command update goal. `--dry-run` is the preview.

**Decision 7 — No `glint/` engine folder in brand repos**
Engine stays as a git dependency (`@vijayatech/glint` in `package.json`), not a
vendored folder. Reasons: (a) multi-brand update becomes `pnpm update` across all
repos instead of 10 manual copies; (b) a local clone invites edits that break the
shared contract; (c) `pnpm glint <cmd>` gives the same discoverability without
the drift risk. Exception path if ever needed: git submodule, not a file copy.

**Decision 8 — `glint export` deferred**
Exit path documented in every brand's `AGENTS.md` ("Leaving Glint" section). The
`cp -r content/ && cp -r public/media/` manual path is sufficient and correct. Build
`glint export` only when a real handoff or migration defines the exact shape needed
(zip, draft inclusion, media path rewriting). Premature build risks building for the
wrong use case.

**Decision 9 — Tasks live in GitHub Issues, not Markdown**
No `TASKS.md`. A prose task file is stale within a day on a solo/small team. Git
issues + `glint feedback` (which prints a pre-filled issue URL) are the task system.
The changelog's `[Unreleased]` section is the "what just changed" view; that's enough.

**Decision 10 — Blog review checklist is brand-generated, not static**
`docs/blog-review-checklist.md` is produced by `reviewChecklistTemplate(brand)` at
`glint new` / `glint sync` — not copied from `src/scaffold/docs/`. Reason: the
checklist references brand-specific docs (voice, strategy, taxonomy, CTAs). Baking
brand names and doc paths into a static copy would require manual updates on every
brand; generating it means it's always current and correctly pointed.

---

## 2026-06-05

**Decision 11 — Multi-tool pipeline plays & wrappers structure**
The content pipeline plays (`docs/pipeline/*.md`) and orchestration documentation (`docs/CONTENT-PIPELINE.md`) are managed as static engine references (Bucket 1). Command wrappers for Claude Code and Antigravity are engine-generated (Bucket 2) so they update dynamically during sync. Customization of voice, strategy, and content is preserved in Bucket 3. The pipeline's automated execution utilizes local subscription state (no metered API keys) and enforces quality via the `glint doctor --strict` gate.

---

## 2026-07-13

**Decision 12 — Markdown twins served as `text/plain` + `Content-Disposition: inline`, not `text/markdown`**
`/raw/<collection>/<slug>.md` now serves `text/plain; charset=utf-8` with
`Content-Disposition: inline`, replacing the previous `text/markdown; charset=utf-8`.
`text/markdown` is the semantically "correct" IETF media type (RFC 7763), but browser
and tool support for it is inconsistent — some clients offer it as a download instead
of rendering inline. `text/plain` + explicit `inline` disposition renders reliably
everywhere (browsers and AI agent fetchers alike) at the cost of the more precise
MIME type. Revisit if `text/markdown` client support becomes reliably universal.

**Decision 13 — Reference implementation: hand-rolled `sitemap.xml.ts` over `@astrojs/sitemap`**
`examples/playground` now generates `sitemap.xml` itself
(`src/pages/sitemap.xml.ts`) instead of via the `@astrojs/sitemap` integration, so
`/raw/blog/<slug>.md` twins can be listed alongside their HTML counterparts at a
distinct, lower `priority` (0.8 HTML / 0.4 twin) — the default integration only
sees rendered Astro routes, not sibling API-route twins. `robots.txt` was updated
to point at `/sitemap.xml` (was `/sitemap-index.xml`, the old integration's output
name).
**Scope note:** this change is scoped to the reference implementation
(`examples/playground`) only, per the requesting task. The scaffold templates
(`src/scaffold/theme*/src/pages/raw/blog/[slug].md.ts.tmpl`, the `astro.config.ts`
generator in `src/cli/commands/new.ts`) still produce the old `text/markdown`
header and rely on `@astrojs/sitemap` with no twin entries — new brand sites via
`glint new` do **not** yet get this pattern. Propagating it to the scaffold/CLI so
every brand gets it out of the box is tracked as follow-up work (the original ask
in the engine feedback issue for markdown-twin sitemap support).

**Decision 14 — Custom response headers need `public/_headers`; the route code alone doesn't serve them**
Verified with `astro build && astro preview` + `curl -I`: this site has no
`output: "server"` / adapter, so every endpoint (`.ts` routes included) is
prerendered once at build time to a plain static file, and the `headers: {...}`
passed to `new Response(...)` in the route handler is **discarded** — a generic
static host infers `Content-Type` from the file extension instead (confirmed:
`/raw/blog/hello-glint.md` served as `Content-Type: text/markdown` with no
`Content-Disposition`, not the `text/plain` + `inline` the route code sets).
Fix: `public/_headers` (Cloudflare Pages' and Netlify's static-header-rules
convention — Astro copies `public/` verbatim into `dist/`), mapping
`/raw/blog/*.md` and `/sitemap.xml` to the intended headers. This covers the
project's documented default host (Cloudflare Pages) and Netlify. It does
**not** cover Vercel (`vercel.json` `headers`) or a bare VPS/Nginx/Caddy origin
(server-config, outside this repo) — those need their own equivalent, not done
here. **This also could not be verified end-to-end locally**: `astro preview`
serves `dist/` directly and has no knowledge of `_headers` (that convention is
interpreted by Cloudflare Pages'/Netlify's edge layer on real deploys), so a
local `curl -I` still shows the extension-inferred type even with the file
present — confirming this requires an actual Cloudflare Pages/Netlify deploy.
