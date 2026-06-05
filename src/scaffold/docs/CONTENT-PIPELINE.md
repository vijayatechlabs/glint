# Multi-Tool Content Pipeline

This document defines the automated orchestration pipeline for drafting, reviewing, and publishing content on Glint.

## Design Flow

```
data/content-plan.md  ──/plan──▶  titles (idea→approved)
        │
        ▼
  /draft  (Gemini ⟶ Antigravity, or Codex)   → content/blog/<slug>.md (draft:true, branch content/<slug>)
        │
        ▼
  /images (Gemini Imagen / Nano Banana)        → public/media/<slug>/* + cover/alt in frontmatter
        │
        ▼
  /review (Claude + Codex, cross‑check)        → docs/reviews/<slug>.md + glint doctor --strict; revise
        │
        ▼
  /ship   gate: glint doctor --strict + glint status + checklist
        │
        ▼
  HUMAN runs glint preview locally, flips draft:false, merges PR  →  CI build → CDN
```

## Role Map

- **Gemini (via Antigravity) & Codex:** Responsible for content ideation (`/plan`), writing drafts (`/draft`), and generating images (`/images`).
- **Claude & Codex:** Responsible for cross-checking, auditing, and reviewing content (`/review`) against the brand guidelines.
- **Human Editor:** Responsible for the local preview review after `/ship`, setting `draft: false`, and merging the PR.

## Branch Convention

Every new post must be developed on a dedicated branch named:
`content/<slug>`

## Content Plan Structure

The `data/content-plan.md` file must be maintained as an **Active Pipeline Table** to prevent bloat. 
- Use the following columns: `Target Date | Category | Title | Status | Notes`.
- Order future-first, with active drafts and upcoming scheduled posts at the top.
- **Archive Roll-off**: Once a post is published, **remove its entry** from `content-plan.md`. The physical `.md` files in `content/blog/` act as the permanent historical record.

## Local Review & Subscription Setup

This pipeline is powered by your local CLI tool subscriptions:
- Claude CLI (`claude`) uses your logged-in Claude Max/Pro session.
- Gemini CLI (`gemini`) uses your Google account login.
- Codex CLI (`codex`) uses your ChatGPT Plus/Pro login.

No API keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) are used, preventing metered usage charges. Because these CLI tools depend on local subscription login sessions, the script must be run on your local machine or a self-hosted runner. **Do NOT run this pipeline on a GitHub-hosted runner**, as it does not possess your browser-based CLI authentication state.

Ensure you have run the login command for each CLI tool prior to executing the pipeline:
- `claude login`
- `gemini login`
- `codex login`

The orchestrator expects to be run from the repo root of a Glint site with `docs/pipeline/*` already scaffolded. If those files are missing after an engine upgrade, run `pnpm glint sync`.

## Scheduled Batch Recipe

To run the content pipeline automatically, set up a cron job on your local machine or a self-hosted runner.

### Crontab Entry Example
To draft and prepare 2 new articles every Monday at 9 AM:
```cron
0 9 * * 1 cd /path/to/your/site && bin/glint-pipeline.sh batch 2 >> log/pipeline.log 2>&1
```

The `batch` command skips items whose slug already exists locally or on the remote `content/<slug>` branch, and prints a created/skipped summary at the end.

### Self-Hosted Runner Note
For CI/CD triggers, configure a self-hosted runner on a machine where you are logged into your subscriptions. Set up the runner to execute the `bin/glint-pipeline.sh` orchestrator.
