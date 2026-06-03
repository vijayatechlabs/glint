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
        dev: "astro dev",
        build: "astro build && pagefind --site dist",
        preview: "astro preview",
      },
      dependencies: {
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

const agentsMd = (brand: string, domain: string, collections: string[], mount: string) =>
  `# AGENTS.md — ${brand} (a Glint site)

Standing instructions for any agent in this repo (Antigravity, Claude Code, Codex,
Cursor). Read this before doing anything.

## What this repo is
The ${collections.join(" / ")} for **${brand}**, built on **Glint**
(\`@vijayatech/glint\`). Content is Markdown; you author it; a human approves via PR;
it builds to static HTML at **${domain}${mount || ""}**. Not WordPress, not a CMS.

## Always read first
1. \`docs/brand-voice.md\` — the voice. Enforce it on every word.
2. \`docs/CONTENT-AUDIT.md\` — triage of imported posts (if this was a migration).

## Hard rules
- **Draft-first:** everything stays \`draft: true\` until a human flips it.
- **PR is the gate:** work on \`content/<slug>\`, open a PR, never push to \`main\`.
- **On-topic or don't ship:** the body must deliver exactly what the title promises.
- **Voice is law:** no generic AI filler. See \`docs/brand-voice.md\`.
- **No leaked scaffolding** (\`Meta Description:\`, \`SEO Slug:\`, \`Alt Text:\`) in bodies.
- **Don't break URLs:** keep slugs stable or add a \`redirects.json\` entry.
- **Every image needs real \`alt\` text.**

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

## Workflow
1. Pick targets (from the audit or a topic plan).
2. Write fresh, on-topic, on-voice content; keep \`draft: true\`.
3. Branch \`content/<slug>\`, commit, open a PR with a short rationale.
4. A human reviews voice + accuracy, merges, flips \`draft: false\`.

## Don't
- Don't deploy, touch DNS, flip drafts live, or push to \`main\`.
- 🔒 **Don't modify the Glint engine** (\`@vijayatech/glint\` or any nested \`glint/\`
  clone). It's shared and read-only here.

## Found a gap or bug in Glint?
**File feedback — don't patch the engine.** Run:
\`\`\`
glint feedback "what's missing or broken" --type enhancement --area build
\`\`\`
It logs to \`glint-feedback.md\` and prints a GitHub issue for the engine repo.
The maintainer changes Glint; you pull the update.

Engine reference: \`@vijayatech/glint\` → \`docs/AGENT-GUIDE.md\`, \`docs/INIT.md\`, \`docs/FEEDBACK.md\`.
`;

const pointer = (brand: string) =>
  `# Follow \`AGENTS.md\` in this repo as your standing instructions, and read
\`docs/brand-voice.md\` before writing content. This is the Glint site for ${brand}.
`;

const workspaceRule = (brand: string) =>
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
  w("redirects.json", "[]\n");
  w("public/media/.gitkeep", "");
  w("docs/brand-voice.md", voiceTemplate(brand));
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
  const themeRoot = fileURLToPath(new URL("../../scaffold/theme", import.meta.url));
  copyTheme(themeRoot, dir, created, skipped);

  console.log(`\nglint new — ${brand} (${domain}), collections [${collections.join(", ")}], mount "${mount || "/"}", target ${target}\n`);
  console.log(`  created (${created.length}):`);
  created.forEach((p) => console.log(`    + ${p.replace(dir + "/", "")}`));
  if (skipped.length) {
    console.log(`  skipped existing (${skipped.length}):`);
    skipped.forEach((p) => console.log(`    · ${p.replace(dir + "/", "")}`));
  }
  console.log(`\n  next: draft docs/brand-voice.md, then write content as drafts → PR.\n`);
}
