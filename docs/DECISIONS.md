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

## 2026-07-17

**Decision 12 — IndexNow post-deployment protocol model**
IndexNow URL submission is split into two phases: (1) build-time generation (the `glintIndexNow` Astro integration writes the verification `<key>.txt` file and injects `/raw` twin URLs into sitemaps), and (2) post-deployment ping (`glint indexnow` command).
- **Why**: Triggering the HTTP submit requests during Astro build-time causes search engines to immediately query the site for the verification key file. Since the site has not yet been deployed or uploaded to the CDN/VPS (e.g. Cloudflare Pages or Coolify), they encounter a 404 error and reject the submission. Moving the HTTP submit to a post-deploy step prevents this race condition.
- **Durable Cursor**: The post-deploy command compares the current commit SHA with a durable commit cursor (`--since-sha`) stored in the deploy environment to submit only added, modified, or deleted URLs, preventing spamming search engines with historical sitemap pings.

---

## 2026-07-23

**Decision 13 — AEO: static in engine, negotiation at brand edge (human-gated)**

- **Audience:** open-source framework for developers, freelancers, and agencies — rich content and blogs managed in git/IDE next to website, app, or project context. Not a hosted CMS.
- **In framework:** markdown twin response headers + helpers (`markdownTwinResponse`), `llms.txt` / twins / schema — pure static, zero runtime, no third-party AEO package dependencies.
- **Out of framework:** Accept / bot-UA content negotiation, optional public `.md` URL rewrite, HTTP `Link` + HTML `Vary` on HTML responses — require edge compute when a brand wants them.
- **Why:** Glint’s contract is static-output and host-agnostic. A required Worker would break that contract.
- **Agent protocol:** `docs/AEO.md` (synced to brands). Agents implement static AEO freely; **must ask humans before** deploying edge workers or changing CDN routes.
- **Origin path stays** `/raw/blog/<slug>.md`; optional public `/blog/<slug>.md` is brand edge mapping only (plan: `.ai/docs/plans/aeo-edge-worker.md`).
- **Docs policy:** do not name or promote external AEO products in user/agent docs; describe Glint’s own behaviour and opt-in edge notes only.
- **Twin Content-Type:** `text/markdown; charset=utf-8` (with AEO headers), not `text/plain`. Supersedes earlier playground experiment that preferred plain text for inline browser rendering.

**Decision 14 — Playground hand-rolled sitemap lists markdown twins**

`examples/playground` generates `sitemap.xml` via `src/pages/sitemap.xml.ts` so
`/raw/blog/<slug>.md` twins appear next to HTML posts (lower priority). Engine
scaffolds still use `@astrojs/sitemap` + optional IndexNow twin injection —
propagating hand-rolled twin listing to all brands is follow-up.

**Decision 15 — Static twin headers may need `public/_headers` (CF Pages / Netlify)**

Prerendered static files often ignore `Response` headers from API routes; hosts
infer type from extension. Playground ships `public/_headers` for
`/raw/blog/*.md` AEO headers and `/sitemap.xml` content-type on Cloudflare Pages
and Netlify. Other hosts need their own header config.

---

## 2026-08-24

**Decision 16 — Preferred Sources button is static framework, domain-level only**

Google Search Central (last updated 2026-08-20 UTC) ships an official
`publisher.js` button that adds the current **host** and returns the reader to
the page. Glint emits that script + a footer button. It is not edge/CDN work.

- Eligible sources are domain or subdomain only. A subdirectory (`/blog`,
  `/glint`) is not its own Preferred Source. The button still adds the host;
  that is expected, not a bug.
- Config: `preferredSources.enabled` (default on). Brands opt out explicitly.
- Do not invent a custom badge, hidden “recommend this brand” strings, or treat
  the button as a citation / AIO ranking KPI.
- Glint’s own marketing URL `vijayatechlabs.com/glint` is a subdirectory of the
  agency host — a distinct Glint Preferred Source needs a Glint host, not an
  engine change on that path (VTL site is out of this repo).

---

## 2026-08-25

**Decision 17 — `llms.txt` is agent nav, not a Google Search ranking file**

Search Central’s generative-AI guide (last updated 2026-07-10 UTC; June 2026
updates note) states Google Search, including AI Overviews and AI Mode, does
not use `llms.txt` or other special AI text/Markdown files. Chrome Lighthouse’s
agentic-browsing audit treats a missing file (404) as N/A and only fails on
server errors.

- Keep emitting `llms.txt` / twins for coding agents (llmstxt.org v2).
- Do not document or market them as a Google AIO/AI Mode ranking lever.
- Google AIO/AI Mode measurement is the GSC Generative AI performance report
  (Search), when the property has it — not `llms.txt` request logs.

---

## 2026-08-26

**Decision 18 — GSC Search generative AI control is eligibility, not an engine switch**

Search Console’s Search generative AI control (help article 16908024; still
rolling out) is the owner-facing include/exclude for AI Overviews, AI Mode, and
generative Discover. Default is include. Child URL-prefix properties inherit
the parent unless an owner overrides.

- Document it in `docs/AEO.md` + scaffold. Do not invent a Glint config flag
  that pretends to flip GSC.
- A missing Generative AI performance report is not automatically “lost AIO”
  (rollout, low impressions, or inherited exclude).
- Exclusion is not a ranking signal for the rest of Search and is not
  Google-Extended / training (that stays `aiCrawlers` / robots).
- Still do not treat the 13–17 Aug 2026 GSC Generative AI logging window as
  lost AIO, and do not use Ahrefs AI-adjusted volume as a KPI.

---

## 2026-09-02

**Decision 19 — GSC Search generative AI control is worldwide (31 Aug 2026)**

Help article 16908024 now states: as of 31 Aug 2026 the Search generative AI
control is rolled out to all websites worldwide. Help article 16984139 notes
the same date for insights, while still listing “not all properties have
access… rolling out over time” as one reason a report may be missing.

- Do not keep documenting the **control** as “still rolling out.”
- A missing Generative AI performance report is still not “lost AIO”
  (low impressions, exclude / inherited exclude, or remaining access gap).
- Still no Glint config flag that pretends to flip GSC.
- Control change still generally takes 1–2 days; exclusion still ≠ rest-of-Search
  ranking and ≠ Google-Extended.
