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

## 2026-06-12

**Decision 12 — Positioning: AEO-outcome wedge, not workflow**
Glint's market wedge is "get cited by AI answer engines," not "edit markdown
easily." The buyer is whoever owns SEO/growth, not the writer. Visual CMS tools
(GitCMS, Keystatic, Tina) sit at the editing layer on top of Glint; they are not
competitors. This hold prevents the common mistake of drifting toward a dashboard
to chase a crowded lane. Any proposal to add editor UI requires overriding this
decision with a dated DECISIONS.md entry.

**Decision 13 — Comparison/SEO content lives in `sites/glint-web/` until a domain exists**
No dedicated Glint domain yet. Comparison pages and marketing content are scaffolded
into `sites/glint-web/` inside this repo as a second, more realistic reference
implementation. When a domain is registered, this folder deploys unchanged — no
restructuring needed. Alternative (separate brand repo) deferred: keeping it
in-repo lets developers review comparison content against the actual engine code.

**Decision 14 — MCP server is per-brand, not a central hosted service**
Glint is an open framework; an MCP server must fit that shape. The right design is
a `glint mcp` CLI command that starts a per-brand MCP server with that brand's
context preloaded (site.config.ts, brand voice, team registry). Each Glint-powered
site runs its own server — the framework nature becomes a feature (agent context
is brand-specific). A central hosted MCP server would require Glint to know about
all deployed brands at a single endpoint, which contradicts the architecture.
Implementing `glint mcp` is Phase 1 (`src/agent/` in ARCHITECTURE.md §11).
