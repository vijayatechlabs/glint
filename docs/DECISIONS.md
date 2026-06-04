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
