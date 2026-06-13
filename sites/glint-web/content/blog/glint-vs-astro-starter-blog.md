---
title: "Glint vs an Astro Starter Blog: Same Builder, Different Outcome"
summary: "Both Glint and Astro's official starter blog use Astro. The difference is what they build for you: a starter gives you a foundation to customise; Glint gives you a complete AEO-native publishing engine you configure with data files."
category: comparisons
tags: [astro, aeo, seo, static-sites, llms-txt, json-ld, agent-publishing, brand-blend]
publishedAt: 2026-06-13T09:00:00.000Z
visibility: public
draft: false
cover:
  src: /media/glint-vs-astro-starter-cover.png
  alt: "Astro's rocket logo on the left, Glint lightning bolt on the right, both built on the same static output foundation"
---

Glint is built on Astro. So is the official Astro starter blog (`npm create astro -- --template blog`). Using both is perfectly valid — but they're doing different jobs, and understanding that difference tells you which one to reach for.

## What the Astro starter blog gives you

The Astro blog starter is a clean, minimal foundation:

- A few Astro pages (`src/pages/blog/`, `src/pages/blog/[slug].astro`)
- Markdown content with frontmatter (`src/content/blog/`)
- Basic RSS feed (`src/pages/rss.xml.js`)
- A `sitemap.xml` via `@astrojs/sitemap`
- Responsive design, light/dark mode, sensible defaults

It's a starting point you're expected to customise: change the layout, adjust the styles, add the features your specific site needs. No content contract is enforced. There's no validation that your frontmatter is complete.

## What Glint adds

Glint wraps Astro with three things the starter doesn't have:

### 1. A complete AEO surface as a build output

| Output | Astro starter | Glint |
|---|---|---|
| `llms.txt` | Not included | Built in, every build |
| `/raw/*.md` twins | Not included | Built in, every post |
| JSON-LD (Article, BreadcrumbList) | Not included | Built in, always present |
| JSON content API | Not included | `/api/blog.json` + `/api/blog/<slug>.json` |
| sitemap.xml | Plugin (`@astrojs/sitemap`) | Built in (same plugin) |
| RSS | Plugin (`@astrojs/rss`) | Built in |
| Pagefind search | Not included | Built in |
| Related posts | Not included | Built in (computed from tags) |

Every item in the "Not included" column is something you'd implement yourself after starting from the Astro starter. In Glint, it's already there on day one.

### 2. A validated content contract

The Astro starter has no frontmatter validation. You can publish a post without a `description`, without `tags`, with a broken date — Astro builds it. Any missing SEO or AEO field is a silent gap.

Glint enforces a Zod schema via `glint doctor`, which runs in CI before merge:
- Missing `summary` (the meta description) → error
- `tags` not in `data/tags.md` registry → warning
- Broken internal links → error
- Published post linking to a draft → error

A post that merges has passed the quality gate. No silent gaps.

### 3. Brand blend and multi-brand topology

The Astro starter is a standalone site. Glint is designed to be mounted as `/blog` on an existing app, with the blog's design matching the app's CSS tokens:

```sh
glint theme pull --tailwind ../myapp/tailwind.config.ts
```

This extracts the app's palette and writes it into `public/theme.css`. The blog header and footer use token-styled components. The result is a blog that looks like part of the product, not a separate thing built on a different starter.

The multi-brand pattern extends this: `@vijayatech/glint` is the shared engine package; each brand is a separate repo with its own `data/site.config.ts` and content. One `pnpm update @vijayatech/glint` propagates engine improvements to every brand site.

## When the Astro starter is the right choice

- You need a custom design that doesn't match an existing app's tokens.
- You need features the Glint engine doesn't include (membership, e-commerce, multilingual routing).
- You want full control over the Astro pages — you're building a unique product, not a content site.
- You don't need `llms.txt` or markdown twins.

The Astro starter is a blank canvas. That's its strength: it doesn't constrain you.

## When Glint is the right choice

- You want the AEO surface from day one, not as a build-it-yourself project.
- You're publishing a brand blog that should look like the brand's existing product.
- You want frontmatter validation to catch quality gaps before they go live.
- You manage multiple content sites and want a shared, versioned engine.

## The honest summary

If you're happy building the AEO layer yourself — implementing `llms.txt`, the `/raw` twin routes, the JSON-LD partials, the content API — the Astro starter is a perfectly good foundation. It's what Glint is built on.

If you want those things to just work, and you're publishing the kind of content (brand blog, AEO-optimised posts, multi-brand setup) Glint is designed for, `glint new --dir myblog` gets you there faster than starting from scratch.

Same builder. Different outcome.
