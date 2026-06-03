# Glint Init — the state-aware initialization system

Glint's analog of OpenStart's `/onboard`. When an agent (Claude, Antigravity,
Codex) is pointed at a repo and asked to "set up Glint" or runs `glint init`, it
follows **this runbook**: it figures out what the project *is*, what *state* it's
in, drafts the brand voice, unfolds the structure, and hands back a status-aware
plan — instead of blindly scaffolding.

Flow, mirroring OpenStart: **discover → understand → voice → unfold → status → review → apply.**

---

## Onboarding model: capture once → compile forever

All per-brand variability is captured **once** at onboarding into a declarative
**Brand Manifest** (`site.config.ts` + `theme.css` + `data/*`). Afterward the
engine is uniform and every build is deterministic and static — no per-build cost,
tokens, or drift.

Most things are **not** per-brand — page layouts, search, sitemap, `llms.txt`,
JSON-LD are engine-invariant. The captured surface is deliberately small:

```
identity    name · domain · logo · tagline
tokens      colors · fonts · radius · dark/light        → theme.css
chrome      nav[] · footer[] · social[]                 → Glint header/footer
mount       standalone | /blog-on-app · deployTarget · host
collections [blog, …]
gating      none (default)   ← auth is opt-in, rarely used; blogs are public
indexing    sitemap/robots/llms on · IndexNow key (auto)
```

### Detector-driven capture (low input, low tokens, low error)
Onboarding runs **deterministic detectors**, then asks the human to confirm only
low-confidence gaps:
- `glint theme pull` — tokens from the app's `tailwind.config`/CSS (repo) or the live site (URL)
- chrome/nav from the live `<header>`/`<footer>`
- host/mount/auth from `package.json` / `netlify.toml` / `vercel.json` / deps

These are scripts, not LLM reading → cheap and repeatable. Target: **<30 min,
<10 human inputs** per brand; everything static and simple afterward.

### `glint onboard` — detect → confirm → unfold → verify
1. **DETECT** — detectors against the app repo/domain → draft manifest
2. **CONFIRM** — one short pass; human fixes only what detectors got wrong
3. **UNFOLD** — `glint new` generates the site from the manifest
4. **VERIFY** — `glint doctor` + preview build

---

## States Glint detects

`glint init` inspects the target dir and classifies it into one mode:

| Mode | Signal | What it means |
|---|---|---|
| **FRESH** | no `content/`, no migration source, no site files | Greenfield brand — scaffold + seed |
| **MIGRATION** | a WXR `*.xml` (or `--from wordpress --url …`) present | Existing CMS to import + audit + regenerate |
| **ADOPT** | site files exist (package.json/index.html) but not Glint | Existing site to fold into Glint |
| **ESTABLISHED** | `AGENTS.md` + `content/` already present | Already a Glint site — add content / re-audit / update engine |

It also auto-detects: brand name (git remote / dir / package name), domain guess,
enabled collections, whether `docs/brand-voice.md` exists, and the framework.

---

## The runbook (what the agent does)

### 1. DISCOVER — `glint init`
Run `glint init` (optionally `--dir <path>`). Read the printed **state report**:
mode, brand guess, content count, voice present?, migration source, framework.
This is deterministic — no questions yet.

### 2. UNDERSTAND — confirm only what wasn't detected
Ask the human *only* the gaps:
- Brand name + primary domain (if not inferable).
- Site type / collections to enable (`blog`, `case-studies`, `news`, `events`, `profiles`).
- Mount strategy: standalone site vs `/blog` mounted onto an existing app.
- Deploy target (`cf-pages` | `coolify` | `netlify` | `vercel`).
Keep it to the minimum — never re-ask what `glint init` already found.

### 3. VOICE — create or analyse the brand voice
- **Has `docs/brand-voice.md`** → load it, confirm it's current.
- **Has a live domain** → fetch the site, derive a draft voice guide (product,
  audience, tone, vocabulary, do/don'ts), write `docs/brand-voice.md`, get approval.
- **Neither** → short interview (3–5 questions) → draft the voice guide.
Voice is approved *before* any content is written.

### 4. UNFOLD — `glint new`
Run `glint new` to scaffold (idempotent — only creates what's missing):
`content/<collection>/`, `data/site.config.ts`, `data/{team,links}.json`,
`redirects.json`, `public/media/`, `docs/brand-voice.md` (template), and the agent
files (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `.agents/rules/glint.md`).

### 5. STATUS-SPECIFIC next steps
- **FRESH** → propose a topic plan from the voice + audience; seed 1 sample draft.
- **MIGRATION** → `glint import <platform> --wxr … --out .` → read the generated
  `docs/CONTENT-AUDIT.md` → recommend regenerate-vs-refresh per post (don't salvage
  off-topic AI filler). Derive voice from the *old* live site.
- **ADOPT** → map existing pages/content into collections; plan body migration.
- **ESTABLISHED** → offer: add content, re-audit, or bump the engine version.

### 6. REVIEW — human gate
Everything lands as `draft: true` on a branch. Open a PR. A human approves voice +
content. Agents never push to `main`, never flip drafts, never deploy.

### 7. APPLY — human merges
Merge → CI builds static → deploy (per `docs/ARCHITECTURE.md`). Apply
`redirects.json`; ping IndexNow on publish.

---

## Entry points (per tool)

- **Any terminal:** `pnpm glint init` then `glint new` / `glint import …`.
- **Claude Code:** the `glint-init` skill wraps this runbook.
- **Antigravity:** a `/glint-init` workflow (slash command) wraps it; see
  `docs/antigravity.md` in the brand repo for prompts.
- All of them read the same `AGENTS.md` and follow this file — one system, many agents.
