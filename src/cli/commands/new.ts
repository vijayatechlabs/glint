/**
 * `glint new [--dir .] [--brand X] [--domain x.com] [--collections blog,case-studies] [--mount /blog] [--target cf-pages]`
 *
 * The UNFOLD step (see docs/INIT.md). Scaffolds a Glint brand site's structure
 * and agent files. Idempotent: only writes files that don't already exist, so it
 * is safe to run on a partially set-up repo to fill the gaps.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

function writeIfMissing(path: string, content: string, created: string[], skipped: string[]): void {
  if (existsSync(path)) {
    skipped.push(path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  created.push(path);
}

const siteConfig = (brand: string, domain: string, baseUrl: string, collections: string[], mount: string, target: string) =>
  `// Brand config. The engine reads this to theme + wire collections.
export const site = {
  brand: ${JSON.stringify(brand)},
  domain: ${JSON.stringify(domain)},
  baseUrl: ${JSON.stringify(baseUrl)},
  mount: ${JSON.stringify(mount || "/")},          // "/blog" to mount onto an app, "/" for standalone
  deployTarget: ${JSON.stringify(target)},          // cf-pages | coolify | netlify | vercel
  collections: ${JSON.stringify(collections)},
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
Don't deploy, touch DNS, flip drafts live, or push to \`main\`.

Engine reference: \`@vijayatech/glint\` → \`docs/AGENT-GUIDE.md\`, \`docs/INIT.md\`.
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
  w("redirects.json", "[]\n");
  w("public/media/.gitkeep", "");
  w("docs/brand-voice.md", voiceTemplate(brand));
  w("AGENTS.md", agentsMd(brand, domain, collections, mount));
  w("GEMINI.md", `# GEMINI.md\n\n${pointer(brand)}`);
  w("CLAUDE.md", `# CLAUDE.md\n\n${pointer(brand)}`);
  w(".agents/rules/glint.md", workspaceRule(brand));

  console.log(`\nglint new — ${brand} (${domain}), collections [${collections.join(", ")}], mount "${mount || "/"}", target ${target}\n`);
  console.log(`  created (${created.length}):`);
  created.forEach((p) => console.log(`    + ${p.replace(dir + "/", "")}`));
  if (skipped.length) {
    console.log(`  skipped existing (${skipped.length}):`);
    skipped.forEach((p) => console.log(`    · ${p.replace(dir + "/", "")}`));
  }
  console.log(`\n  next: draft docs/brand-voice.md, then write content as drafts → PR.\n`);
}
