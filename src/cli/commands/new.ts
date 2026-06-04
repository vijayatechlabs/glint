/**
 * `glint new [--dir .] [--brand X] [--domain x.com] [--collections blog,case-studies] [--mount /blog] [--target cf-pages]`
 *
 * The UNFOLD step (see docs/INIT.md). Scaffolds a Glint brand site's structure
 * and agent files. Idempotent: only writes files that don't already exist, so it
 * is safe to run on a partially set-up repo to fill the gaps.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function writeIfMissing(path: string, content: string, created: string[], skipped: string[]): void {
  if (existsSync(path)) {
    skipped.push(path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  created.push(path);
}

/** Locate the engine's scaffold theme, robustly across dev (running from src/)
 *  and published builds (running from dist/, with src/scaffold shipped). */
export function scaffoldDir(sub: string): string {
  let d = fileURLToPath(new URL(".", import.meta.url));
  for (let i = 0; i < 8; i++) {
    const a = join(d, "src", "scaffold", sub);
    if (existsSync(a)) return a;
    const b = join(d, "scaffold", sub);
    if (existsSync(b)) return b;
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
  throw new Error(`Glint scaffold not found (expected src/scaffold/${sub}).`);
}

/** Recursively copy the engine's Astro theme templates into the site, stripping
 *  the `.tmpl` suffix and never overwriting existing files. The `.tmpl` suffix
 *  keeps the templates out of the engine's own typecheck. */
function copyTheme(themeRoot: string, dest: string, created: string[], skipped: string[]): void {
  if (!existsSync(themeRoot)) return;
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(themeRoot, rel), { withFileTypes: true })) {
      const childRel = rel ? join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) walk(childRel);
      else {
        const outRel = childRel.replace(/\.tmpl$/, "");
        writeIfMissing(join(dest, outRel), readFileSync(join(themeRoot, childRel), "utf8"), created, skipped);
      }
    }
  };
  walk("");
}

const packageJson = (slug: string) =>
  JSON.stringify(
    {
      name: slug,
      type: "module",
      private: true,
      scripts: {
        // Expose the engine CLI as `pnpm glint <cmd>` so it works from the repo
        // root without a global install (the bin lives in node_modules/.bin).
        glint: "glint",
        dev: "astro dev",
        build: "astro build && pagefind --site dist",
        preview: "astro preview",
      },
      dependencies: {
        // Engine: schema, CLI, validators — single source of truth for the contract.
        "@vijayatech/glint": "git+https://github.com/vijayatechlabs/glint.git",
        astro: "^6.0.0",
        "@astrojs/rss": "^4.0.11",
        "@astrojs/sitemap": "^3.3.0",
      },
      devDependencies: {
        pagefind: "^1.1.0",
      },
    },
    null,
    2,
  ) + "\n";

const astroConfig = (siteUrl: string) =>
  `import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: ${JSON.stringify(siteUrl)},
  integrations: [sitemap()],
});
`;

// theme.css holds ONLY brand tokens (regenerate with `glint theme pull`).
// Structural CSS lives in the theme's src/styles/base.css (engine-owned).
const themeCss = (brand: string) =>
  `/* ${brand} — brand design tokens. Mirror your app's palette + type so the blog
   blends in. Regenerate from the app with: glint theme pull --tailwind <path>. */
:root {
  --bg: #ffffff;
  --fg: #1a1a1a;
  --muted: #6b7280;
  --border: #e5e7eb;
  --brand: #2563eb;
  --brand-hover: #1d4ed8;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --maxw: 720px;
  --radius: 8px;
}
`;

const customCss = (brand: string) =>
  `/* ${brand} — brand-specific overrides. Glint won't touch this file. */
`;

const siteConfig = (brand: string, domain: string, baseUrl: string, collections: string[], mount: string, target: string) =>
  `// Brand config. The engine reads this to theme + wire collections.
export const site = {
  brand: ${JSON.stringify(brand)},
  domain: ${JSON.stringify(domain)},
  baseUrl: ${JSON.stringify(baseUrl)},
  mount: ${JSON.stringify(mount || "/")},          // "/blog" to mount onto an app, "/" for standalone
  deployTarget: ${JSON.stringify(target)},          // cf-pages | coolify | netlify | vercel
  collections: ${JSON.stringify(collections)},
  logo: "",                          // e.g. "/media/logo.svg"; "" shows the brand name
  favicon: "",                       // e.g. "/favicon.png" — match the host site's icon
  nav: [{ label: "Home", href: ${JSON.stringify(`https://${domain}`)} }],
  footer: [],                        // [{ label, href }] — privacy, contact, etc.
  social: {},                        // { twitter, github, linkedin }
  seo: {
    titleTemplate: "%s — ${brand}",
    defaultDescription: "",
    ogImage: "/media/og-default.png",
  },
} as const;
`;

export const agentsMd = (brand: string, domain: string, collections: string[], mount: string) =>
  `# AGENTS.md — ${brand} (a Glint site)

Standing instructions for any agent in this repo (Antigravity, Claude Code, Codex,
Cursor). Read this before doing anything.

## What this repo is
The ${collections.join(" / ")} for **${brand}**, built on **Glint**
(\`@vijayatech/glint\`). Content is Markdown; you author it; a human approves via PR;
it builds to static HTML at **${domain}${mount || ""}**. Not WordPress, not a CMS.

## Always read first
1. \`data/content-strategy.md\` — what to write & why (pillars, ICP, cadence, rules).
2. \`docs/content-playbook.md\` — blog types + how to structure each for answer engines.
3. \`docs/brand-voice.md\` — the voice. Enforce it on every word.
4. \`data/categories.md\` / \`data/tags.md\` — the taxonomy to file under.
5. \`docs/CONTENT-AUDIT.md\` — triage of imported posts (if this was a migration).

## Hard rules
- **Draft-first:** everything stays \`draft: true\` until a human flips it.
- **PR is the gate:** work on \`content/<slug>\`, open a PR, never push to \`main\`.
- **On-topic or don't ship:** the body must deliver exactly what the title promises.
- **Voice is law:** no generic AI filler. See \`docs/brand-voice.md\`.
- **No leaked scaffolding** (\`Meta Description:\`, \`SEO Slug:\`, \`Alt Text:\`) in bodies.
- **Don't break URLs:** keep slugs stable or add a \`redirects.json\` entry.
- **Every image needs real \`alt\` text.**
- **Stagger publish dates:** never stamp a batch with one timestamp — sequence
  \`publishedAt\` per the cadence in \`data/content-strategy.md\`.
- **No duplicate posts:** scan \`content/\` + \`data/content-plan.md\`; sharpen the angle
  instead of repeating an existing post.
- **Review gate:** self-check against \`docs/blog-review-checklist.md\` before the PR.

## Frontmatter contract (\`content/<collection>/<slug>.md\`)
\`\`\`yaml
---
title: "Specific, benefit-led"
summary: "1–2 sentences; doubles as the meta description"
tags: []
publishedAt: 2026-01-01T00:00:00.000Z
visibility: public        # public | gated | members
draft: true
cover: { src: /media/<slug>.png, alt: "describes the image + relevance" }
---
\`\`\`

## Content generation (how to write a post)
1. **Ideate.** Read \`data/content-strategy.md\` (pick a Pillar + Type). Scan existing
   \`content/\` and \`data/content-plan.md\` to avoid duplication and find gaps.
2. **Research.** Use your native web search; **cite sources**; never invent stats or
   assert decaying facts (prices, "available domains") as permanent.
3. **Propose titles first.** Offer a short shortlist (log to \`data/content-plan.md\` as
   \`idea\`); let the human pick before drafting. Don't jump straight to a full draft.
4. **Draft** the chosen title per \`docs/content-playbook.md\` (answer-first, question
   headings, a table/steps where it fits, an FAQ, sources). Enforce the brand voice +
   frontmatter contract; set \`category\`/\`tags\` from the registries. Keep \`draft: true\`.
5. **Self-review** against \`docs/blog-review-checklist.md\` (every **[human]** item)
   before opening the PR — don't hand a reviewer work you can clear yourself.
6. **Branch \`content/<slug>\`, run \`pnpm glint doctor\`, open a PR.**
7. A human reviews against \`docs/blog-review-checklist.md\`, merges, flips \`draft: false\`.

Scheduled batches: an agent runner (cron / scheduled task) fires "draft the next N
approved items from \`data/content-plan.md\`" — same flow, no engine code.

## Don't
- Don't deploy, touch DNS, flip drafts live, or push to \`main\`.
- 🔒 **Don't modify the Glint engine** (\`@vijayatech/glint\` or any nested \`glint/\`
  clone). It's shared and read-only here.

## Running the engine CLI
The engine is the \`@vijayatech/glint\` dependency, not a folder in this repo. Run it
as a package script from the repo root — **no global install**:
\`\`\`
pnpm glint <command>      # sync · doctor · status · build · preview · feedback
\`\`\`
(Equivalently \`npx glint <command>\`.) Bare \`glint\` won't work — the binary lives in
\`node_modules/.bin\`, not on your PATH.

## Updating Glint
The engine and this site update **separately**:
1. \`pnpm update @vijayatech/glint\` — pull the latest engine (schema, CLI, build
   logic). Schema/validator changes apply immediately.
2. \`pnpm glint sync --dry-run\` — preview which **engine-managed** files would change
   (this is also the live answer to "which files are mine vs the engine's").
3. \`pnpm glint sync\` — apply. It overwrites engine-reference docs and regenerates
   engine-generated files (this AGENTS.md, the review checklist, agent rules) from
   your \`data/site.config.ts\`. It **never touches** brand-owned files: your
   \`brand-voice.md\`, \`categories.md\`, \`content-strategy.md\`, theme tokens, or content.

## Leaving Glint (no lock-in)
Your content is portable Markdown — there's no database or runtime to escape:
- **Take your content:** copy \`content/\` (posts) and \`public/media/\` (images). Done.
- **Drop the engine, keep the site:** remove \`@vijayatech/glint\` from \`package.json\`;
  the Astro theme in \`src/\` was copied in at scaffold time and still \`astro build\`s
  (you lose \`doctor\`/\`sync\`/\`status\`, not the site).
- **Delete everything:** \`rm -rf\` this repo. Nothing lingers — no DB, no daemon, no
  cloud state. What you deployed was static HTML.

## Found a gap or bug in Glint?
**File feedback — don't patch the engine.** Run:
\`\`\`
pnpm glint feedback "what's missing or broken" --type enhancement --area build
\`\`\`
It logs to \`glint-feedback.md\` and prints a GitHub issue for the engine repo.
The maintainer changes Glint; you pull the update.

Engine reference: \`@vijayatech/glint\` → \`docs/AGENT-GUIDE.md\`, \`docs/INIT.md\`, \`docs/FEEDBACK.md\`.
`;

export const pointer = (brand: string) =>
  `# Follow \`AGENTS.md\` in this repo as your standing instructions, and read
\`docs/brand-voice.md\` before writing content. This is the Glint site for ${brand}.
`;

export const workspaceRule = (brand: string) =>
  `# Glint workspace rule (always-active)

This is the ${brand} site on the Glint engine. For every task:
- Follow \`AGENTS.md\` (repo root) — the full operating contract.
- Read \`docs/brand-voice.md\` and enforce it before writing content.
- Draft-first, PR-gated: keep \`draft: true\`, branch \`content/<slug>\`, never push to \`main\`, never publish or deploy.
- A post must genuinely deliver its title. No generic AI filler.
- 🔒 Never modify the Glint engine. Report gaps with \`glint feedback "…"\` instead.
`;

const voiceTemplate = (brand: string) =>
  `# ${brand} — Brand Voice Guide

> TEMPLATE — replace with the real voice (derive from the live site or interview),
> then approve. Every rewrite and agent-authored post is enforced against this.

## What ${brand} is
<one paragraph: product + core value prop>

## Audience
<who we write for>

## Voice
- <tone bullets: e.g. casual, direct, action-led>

## Do
- Open with the reader's problem + a concrete payoff.
- Specifics, examples, active voice, scannable subheads.

## Don't
- No generic AI clichés ("exhilarating rush", "in today's fast-paced world").
- No title/body mismatch. No leaked scaffolding. No decaying year-stamps.

## Formatting & SEO
- Title: specific, benefit-led. Summary doubles as meta description.
- Internal links to related posts + the product. Real alt text on every image.
`;

const categoriesTemplate = (brand: string) =>
  `# Categories

Controlled vocabulary for ${brand}. **One primary category per post.** Keep this
list short. \`glint doctor\` warns if a post uses a category not listed here.
Format: a \`##\` heading (display name), a \`slug:\` line, then a one-line description
(used as on-page copy on the category archive).

## Example Category
slug: example-category
What this category covers and why a reader should care.
`;

const tagsTemplate = (brand: string) =>
  `# Tags

Controlled vocabulary for ${brand}. Many granular tags; reuse before inventing.
\`glint doctor\` warns on unlisted tags. Format: \`- slug — description\`.

- example-tag — what this tag covers
`;

const contentStrategyTemplate = (brand: string) =>
  `# Content Strategy — ${brand}

The "brain" agents read before writing. Defines what to write & why. Pair with
\`docs/content-playbook.md\` (types + AEO frameworks), \`docs/brand-voice.md\` (tone),
and \`data/categories.md\` / \`data/tags.md\` (taxonomy).

## Mission / Vision
<Why ${brand} exists and who it serves. Content should advance this.>

## Audience / ICP
<Who we write for: roles, goals, pains. What decision are we helping them make?>

## Pillars
The core themes we own. Every post maps to one. (Replace with real pillars.)

1. **<Pillar A>** — <what it covers, why it matters to the ICP>
2. **<Pillar B>** — <…>
3. **<Pillar C>** — <…>

## Content types we publish
Pick from \`docs/content-playbook.md\` (full structures + AEO guidance there):
guide · how-to / tutorial · listicle · comparison · case study · feature/launch ·
trends · industry news / analysis · tips · glossary ("what is X?") · FAQ.

## Cadence
<e.g. 2 posts/week; 1 pillar guide/month. Used for scheduled batches.>

## Research & quality rules
- Use native web search; **cite sources**; never invent stats.
- Don't assert decaying facts (prices, "available domains") as permanent.
- Avoid duplication: scan existing \`content/\` and \`data/content-plan.md\` first.
- Answer-first, question-based headings, a table/steps where it fits, an FAQ.
`;

const contentPlanTemplate = (brand: string) =>
  `# Content Plan — ${brand}

Living backlog. Agents propose titles here (status \`idea\`), you approve
(\`approved\`), they draft (\`drafting\`), then it ships (\`published\`). Supports
scheduled batches: "draft the next N approved items."

Format: \`- [status] Pillar · Type · Title — note\`

## Backlog
- [idea] <Pillar> · listicle · <Working title> — <angle / source>

## Approved (ready to draft)

## Drafting (PR open)

## Published
`;

export const reviewChecklistTemplate = (brand: string) =>
  `# Blog Review Checklist — ${brand}

The pre-publish gate. A human (or agent) reviews **every** post against this before
it merges and goes live. It is **brand-aware**: most checks point at the docs
onboarding prepared for ${brand}, so reviewing a post means confirming it matches
*this brand's* voice, keywords, taxonomy, and goals — not a generic standard.

Pairs with:
- \`docs/brand-voice.md\` — the voice every post is enforced against.
- \`data/content-strategy.md\` — pillars, target keywords/topics, ICP, goals, cadence.
- \`data/categories.md\` / \`data/tags.md\` — the controlled taxonomy.
- \`data/links.json\` — canonical/shared URLs + CTAs to link to.
- \`docs/content-playbook.md\` — blog types + AEO structure (how to write).

**[doctor]** items are machine-checked by \`glint doctor\` (CI fails on them) — just
confirm the run is green. **[human]** items need judgment no validator can make —
spend your attention there.

> A post is ready only when \`glint doctor\` is green **and** every [human] box is
> honestly ticked. Drafts (\`draft: true\`) 404 in production until then.

---

## 1. Brand fit — does this belong to ${brand}?
- [ ] **[human] On-strategy.** Maps to a pillar in \`data/content-strategy.md\` and
      serves ${brand}'s goal/ICP — not a random topic.
- [ ] **[human] Target keyword/topic.** Targets a primary keyword or question from the
      strategy, and that term reads naturally in the title, the summary, and at least
      one \`##\` heading. No keyword stuffing, no off-topic terms.
- [ ] **[human] On-voice.** Tone, person, and vocabulary match \`docs/brand-voice.md\`.
- [ ] **[human] Clear CTA.** Ends with a concrete next step that advances ${brand}'s
      goal (try the product, book a call, read the pillar), linked via
      \`data/links.json\` — never a dead end.

## 2. Frontmatter contract
- [ ] **[doctor]** Schema valid — \`title\`, \`summary\`, \`publishedAt\` present and typed.
- [ ] **[human] Title** delivers what the body covers — specific, benefit-led, no
      clickbait, no title/body mismatch.
- [ ] **[human] Summary** is a 1–2 sentence value hook; it doubles as the meta
      description, so it must read like one.
- [ ] **[doctor] Category** — one kebab-case slug from \`data/categories.md\`.
- [ ] **[doctor] Tags** — from \`data/tags.md\` (reuse before inventing; ~3–5).
- [ ] **[human] Author** resolves to \`data/team.json\` (E-E-A-T: name a real author).
- [ ] **[doctor] Cover** \`alt\` present + descriptive. **[human]** \`cover.src\` points
      at a real asset and the \`alt\` truly describes it.
- [ ] **[human] SEO overrides** (\`seo.title\`/\`seo.description\`) set only when they
      should differ from \`title\`/\`summary\`.
- [ ] **[doctor]** No leaked scaffolding or unfilled placeholders in the body.

## 3. AEO formatting — so answer engines can quote it
- [ ] **[human] Answer-first.** Opens with a bold \`**TL;DR —**\` (or equally direct
      first 2–3 sentences) stating the conclusion.
- [ ] **[human] Question-based headings** matching what readers actually ask.
- [ ] **[human] Self-contained sections** — each answers one thing fully; no "as
      mentioned above."
- [ ] **[human] Extractable data** — at least one table, ordered step list, or
      comparison matrix.
- [ ] **[human] Logical heading hierarchy** — no skipped levels.
- [ ] **[human] FAQ** near the end: 2–3 specific long-tail questions answered directly.
- [ ] **[human] Freshness** — time-sensitive claims carry a date / "as of {year}"; no
      decaying fact stated as permanent.

## 4. SEO fundamentals
- [ ] **[human] Internal linking.** Links to >=2 related ${brand} posts and the
      relevant product/landing page; descriptive anchor text, not "click here". Use
      \`data/links.json\` for shared URLs so one change updates every post.
- [ ] **[doctor] Links resolve.** Broken internal links are errors; a published post
      linking to a draft is flagged.
- [ ] **[human] No duplicate / cannibalizing post.** Not a near-duplicate of existing
      content — scan \`content/\` and \`data/content-plan.md\`. If it overlaps an existing
      post, merge or sharpen the angle/keyword. (\`doctor\` catches duplicate *slugs*;
      overlapping *topics* are your call.)
- [ ] **[human] No URL break on rename.** A changed slug has a \`redirects.json\` entry.
- [ ] **[human] Publish scheduling.** Shipping a batch? \`publishedAt\` is **staggered**
      (sequential dates per the cadence in \`data/content-strategy.md\`) — don't stamp
      10 posts with the same timestamp. Future-dated posts stay \`draft: false\` with a
      future \`publishedAt\` so the daily rebuild flips them live on the day.

## 5. Brand voice & fatal sins — reasons to block the merge
- [ ] **[human] No AI-speak** — zero *delve, tapestry, landscape, unleash,
      revolutionize, unlock, beacon, realm, testament, in today's fast-paced world*.
- [ ] **[human] No filler intro** — gets to the point; no throat-clearing.
- [ ] **[human] Concrete over abstract** — claims grounded in real, named examples
      (and ${brand}'s own stack / cases where natural), not hand-waving.

## 6. Accuracy & sourcing
- [ ] **[human] Verified stats.** Every figure links to a specific reputable source,
      or is softened to a general statement. Never invent numbers.
- [ ] **[human] Pricing caveat.** Currency figures carry "checked as of {year}" + an
      inline link to the vendor's official pricing page.
- [ ] **[human] Sources section** — bulleted, linking to direct URLs (the exact page),
      not generic homepages.

## 7. Grammar & mechanics
- [ ] **[human] No typos** (e.g. *qualifer* -> *qualifier*).
- [ ] **[human] Subject-verb agreement** + consistent tense.
- [ ] **[human] Logical flow** — definitions precede the comparisons that use them.

---

## How to use this
1. Open the post's PR — its preview deploy renders the draft (\`noindex\` banner).
2. Confirm \`glint doctor\` is green -> every [doctor] item is cleared at once.
3. Walk the [human] items against the rendered post **and** the Markdown source.
4. Block on any §5 fatal sin, unsourced §6 claim, or a duplicate/scheduling issue.
5. Approve -> merge -> the build publishes and emits the full SEO/AEO surface.

> Onboarding generates this file for ${brand}. The brand specifics live in the docs
> above, not here — so if the voice, keywords, categories, or CTAs change, update
> *those* docs and every review stays current; the checklist keeps pointing at them.
`;

export async function runNew(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--")) flags.set(a.slice(2), args[++i] ?? "");
  }
  const dir = flags.get("dir") ?? process.cwd();
  const brand = flags.get("brand") ?? dir.split(/[\\/]/).filter(Boolean).pop() ?? "site";
  const domain = flags.get("domain") ?? `${brand}.com`;
  const collections = (flags.get("collections") ?? "blog").split(",").map((c) => c.trim()).filter(Boolean);
  const mount = flags.get("mount") ?? "";
  const target = flags.get("target") ?? "cf-pages";
  const baseUrl = mount ? `https://${domain}${mount}` : `https://${domain}`;

  const created: string[] = [];
  const skipped: string[] = [];
  const w = (p: string, c: string) => writeIfMissing(join(dir, p), c, created, skipped);

  for (const col of collections) w(`content/${col}/.gitkeep`, "");
  w("data/site.config.ts", siteConfig(brand, domain, baseUrl, collections, mount, target));
  w("data/team.json", "[]\n");
  w("data/links.json", "{}\n");
  w("data/categories.md", categoriesTemplate(brand));
  w("data/tags.md", tagsTemplate(brand));
  w("data/content-strategy.md", contentStrategyTemplate(brand));
  w("data/content-plan.md", contentPlanTemplate(brand));
  w("redirects.json", "[]\n");
  w("public/media/.gitkeep", "");
  w("docs/brand-voice.md", voiceTemplate(brand));
  w("docs/blog-review-checklist.md", reviewChecklistTemplate(brand));
  w("AGENTS.md", agentsMd(brand, domain, collections, mount));
  w("GEMINI.md", `# GEMINI.md\n\n${pointer(brand)}`);
  w("CLAUDE.md", `# CLAUDE.md\n\n${pointer(brand)}`);
  w(".agents/rules/glint.md", workspaceRule(brand));

  // Astro rendering layer: brand-aware generated files + the copied theme.
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site";
  w("package.json", packageJson(slug));
  w("astro.config.ts", astroConfig(`https://${domain}`));
  w("public/theme.css", themeCss(brand));
  w("public/custom.css", customCss(brand));
  copyTheme(scaffoldDir("theme"), dir, created, skipped);
  // ship the content playbook (static engine reference) into the brand's docs/
  copyTheme(scaffoldDir("docs"), join(dir, "docs"), created, skipped);

  // Warn about non-blog collections: schemas are registered and doctor validates them,
  // but page rendering (routes, API, raw twins) is blog-only in v1 (Phase 2 roadmap).
  const nonBlog = collections.filter((c) => c !== "blog");
  for (const col of nonBlog) {
    console.warn(
      `  ⚠  collection "${col}": schema registered and doctor-validated, but page rendering\n` +
      `     (routes, RSS, JSON API) is blog-only in v1. Content folders created; rendering Phase 2.`,
    );
  }

  console.log(`\nglint new — ${brand} (${domain}), collections [${collections.join(", ")}], mount "${mount || "/"}", target ${target}\n`);
  console.log(`  created (${created.length}):`);
  created.forEach((p) => console.log(`    + ${p.replace(dir + "/", "")}`));
  if (skipped.length) {
    console.log(`  skipped existing (${skipped.length}):`);
    skipped.forEach((p) => console.log(`    · ${p.replace(dir + "/", "")}`));
  }
  console.log(`\n  next: draft docs/brand-voice.md, then write content as drafts → PR.\n`);
}
