# Glint — Positioning Strategy

**Date:** 2026-06-12 · **Status:** canonical, living doc

This document records the product positioning, buyer definition, differentiators,
and distribution playbook for Glint. Update it when the market picture changes;
never delete past reasoning — add a dated note.

---

## 1. The wedge: outcome, not workflow

**Don't sell** "edit markdown easily" or "static blog with AI draft." Those are
workflow descriptions. Glint's wedge is an **outcome**:

> **Get your content cited by AI answer engines.** Fast static delivery, structured
> data compiled on every build, `/raw` markdown twins and `llms.txt` so LLMs can
> read and attribute you — all automatic, no per-post SEO busywork.

The outcome matters now because AI answer engines (ChatGPT, Claude, Perplexity,
Google AI Overview) are increasingly the first stop before a Google search. Citation
in those surfaces requires machine-readable content: clean markdown, correct
JSON-LD, explicit `llms.txt`. Glint compiles all of that at build time; no other
git-native publishing tool does this as a first-class output.

---

## 2. Who the buyer is

| Buyer | Role | What they care about |
|---|---|---|
| **Glint buyer** | Owns SEO / growth / content ops for the product | "We need our blog to rank *and* get cited in AI answers. We don't want to run WordPress." |
| **CMS tool buyer** | The person who writes the content | "I need to publish without learning Git." |

These are **different people**. A GitCMS license might sit on top of a Glint
site — the writer uses the visual editor, the content compiles through the Glint
engine. They compose; they don't compete.

**Not for:** teams whose primary problem is non-technical editors needing a publish
button. That's Phase 4 / EmDash territory. Trying to win that buyer would require
building a CMS, which is the explicitly rejected direction.

---

## 3. The layer map: Glint is not a CMS

The confusion to avoid — internally and in copy — is treating Glint as a CMS
alternative to Keystatic, Tina, Pages CMS, or GitCMS. They sit at different layers
of the same stack:

```
  ┌───────────────────────────────┐
  │  EDITING LAYER                │  ← GitCMS, Keystatic, Tina, Pages CMS
  │  Visual editor, content board │     (framework-agnostic; sits on top)
  │  for non-dev writers          │
  └───────────────┬───────────────┘
                  │ writes markdown files into git
  ┌───────────────▼───────────────┐
  │  ENGINE LAYER  @vijayatech/glint│  ← Glint lives here
  │  Content contract · AEO emit  │
  │  Brand blend · Agent loop     │
  │  Static build · doctor gate   │
  └───────────────────────────────┘
```

**Implication for messaging:** we compete with WordPress (runtime, database,
runtime plugins for SEO), not with git-based editors. The positioning phrase:

> "Glint is what you use *instead of WordPress*, with an AI agent as the author and
> AI answer engines as the audience."

---

## 4. Shipped differentiators (what nobody else has)

Each is a running, deployed feature — not a roadmap item.

### 4.1 AEO-native output

Every build auto-emits:
- `llms.txt` (the standard for telling LLMs what your site contains)
- `/raw/<slug>.md` markdown twins (clean, LLM-readable copies of every post)
- JSON-LD structured data (Article, BreadcrumbList, WebSite, Organization)
- JSON content API (`/api/blog.json`, `/api/blog/<slug>.json`) for apps and mobile

Zero per-post configuration. This is the product's strongest differentiator because
it is timely (AEO is now), the machinery is real and running, and no competing
git-native tool has made it a first-class output.

### 4.2 Brand blend

`glint theme pull <app-repo>` reads an app's Tailwind/CSS tokens and writes
`theme.css`. The blog header and footer are token-styled components that look like
the rest of the product. Result: the blog feels like part of the app, not a
bolted-on Substack.

No CMS tool solves this: they output generic themes or hand you a design system
configuration. Glint *reads your brand and applies it automatically*.

### 4.3 `doctor` as publishing gate

`glint doctor` runs before merge (via GitHub Actions) and fails the build on:
- Broken internal links
- Published posts linking to draft posts
- Unfilled brand voice / required strategy blocks

The blog can only go live in a state that passes the quality contract. This is the
"we do not ship broken content" guarantee that WordPress and headless CMS tools
rely on manual checklists to approximate.

### 4.4 Engine-as-package, one-command multi-brand

Brand repos depend on `@vijayatech/glint` as a versioned package. A new brand is
`glint onboard --app <repo> --apply` and a config edit — live in a day. Engine
improvements (a new AEO field, a faster build, a bug fix in the link checker)
propagate to every brand with a single `pnpm update @vijayatech/glint`.

This is an agency scaling model: one engineer, N client sites, zero drift between
them. No tool in the editing layer can offer this because they're all per-site.

---

## 5. What to steal from competitors (without becoming them)

### From GitCMS: the SEO distribution playbook

GitCMS has ~13 framework landing pages ("GitCMS for Astro," "GitCMS for Next.js")
and ~17 "vs" comparison pages. This drives organic discovery. Glint should
publish:

- "Glint vs Astro starter blog"
- "Glint vs Hugo for AEO"
- "Glint vs WordPress for content-ops teams"
- "What is llms.txt and why your blog needs it"
- "Static sites and AI answer engines: the AEO case"

**Publication strategy:** publish these *using Glint itself* (dogfood). The repo
structure of each page — schema-valid frontmatter, `llms.txt` registration,
JSON-LD, raw twin — is living proof that the engine does what it claims.

**Where to host (current decision):** No dedicated Glint domain yet. Scaffold
`sites/glint-web/` inside this repo as a second reference implementation (more
realistic than `examples/playground/`). This keeps comparison content reviewable
by developers against the actual engine code. When a domain is registered, the
`sites/glint-web/` content deploys to it unchanged — no restructuring required.

### From GitCMS: MCP / in-app distribution

GitCMS gets discovered inside ChatGPT/Claude conversations because it has an MCP
server. Glint should too — but the design must fit Glint's framework nature.

**Right approach:** a `glint mcp` CLI command that each brand repo runs locally,
starting a per-brand MCP server with that brand's context preloaded (`site.config.ts`,
brand voice, team registry, prior posts). It is **not** a central hosted service.
The framework nature becomes a feature: every Glint-powered site can expose its own
agent-ready server with brand context baked in, matching the architecture's "agent
lives where your context lives" principle.

This is Phase 1 roadmap work (`src/agent/`). See ARCHITECTURE.md §11.

---

## 6. The non-goal: do not drift toward a visual CMS

This is an explicit hold, not an oversight. The editing-layer CMS space is crowded
(GitCMS, Keystatic, Tina, Pages CMS, Sanity) and requires building a dashboard,
auth, real-time collaboration, and media management — the "not for" list from the
README's design rule.

**If a client asks for a non-technical editor surface:** the current answer is
Phase 4 / EmDash, or recommend a GitCMS license on top of Glint. Do not prototype
a custom editor; do not add a `glint admin` command.

Any proposal to add editing UI to the CLI or engine layer requires a DECISIONS.md
entry overriding this hold.

---

## 7. The one honest gap: the engine is invisible

3 GitHub stars, 0 forks as of June 2026. The AEO machinery is built and correct;
the positioning is not yet expressed anywhere a buyer would find it.

**Launch playbook (low-cost):**

1. **Show HN** — lead with the AEO angle: "Show HN: Glint — a static publishing
   engine that compiles llms.txt, JSON-LD, and /raw markdown twins on every build."
   Time it for a Tuesday/Wednesday 9am ET post.

2. **Indie Hackers** — "How we replaced WordPress across multiple brands with a
   git-native engine and an AI author" is the story. Link to a live site and a
   diff of a real post PR.

3. **The comparison pages** (Track B above) generate organic discovery over weeks
   to months. This is the compound play.

4. **Glint publishing Glint's content** — the meta-proof. When `glint.vijayatech.in`
   (or a future glint.sh) runs on Glint, every page's `/raw` twin and JSON-LD is
   visible in the browser, demonstrating the AEO output to the buyer who cares.

---

## 8. Summary: the one sentence

> **Glint is the publishing engine for teams who need their content cited by AI —
> git-native, agent-authored, AEO-compiled, zero WordPress.**
