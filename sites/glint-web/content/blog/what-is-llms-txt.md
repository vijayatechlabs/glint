---
title: "What is llms.txt and Why Your Blog Needs It in 2026"
summary: "llms.txt is a plain-text file that tells AI crawlers what your site contains and where the clean markdown lives. Here's what it is, why it exists, and how Glint generates it automatically on every build."
category: aeo-seo
tags: [llms-txt, aeo, json-ld, markdown]
publishedAt: 2026-06-10T09:00:00.000Z
visibility: public
draft: false
cover:
  src: /media/llms-txt-cover.png
  alt: "A terminal showing the contents of an llms.txt file with a list of markdown URLs"
---

AI answer engines — ChatGPT, Claude, Perplexity, Google AI Overviews — increasingly answer questions by reading the web rather than retrieving cached index entries. When they read your site, they prefer clean, structured content over rendered HTML. `llms.txt` is the file that tells them where to find it.

## What llms.txt actually is

`llms.txt` is a plain-text file, served at `yourdomain.com/llms.txt`, that lists the canonical URLs and raw markdown twins for every published page on your site. It's the AI-crawler equivalent of `sitemap.xml`, but instead of telling Google *where* your pages are, it tells language models *what your content is* and *where to read a clean version of it*.

A minimal `llms.txt` looks like this:

```
# Glint Blog

> The lightning publishing engine for the AI era.

## Blog

- [What is llms.txt and Why Your Blog Needs It in 2026](https://glint.vijayatech.in/blog/what-is-llms-txt/): /raw/blog/what-is-llms-txt.md
- [Glint vs WordPress for AEO](https://glint.vijayatech.in/blog/glint-vs-wordpress-for-aeo/): /raw/blog/glint-vs-wordpress-for-aeo.md
```

The `/raw/blog/<slug>.md` paths are **markdown twins** — clean copies of each post, served as plain `.md` files, identical to the source minus Astro templating. An LLM reading your site gets the exact text you wrote, not a pile of nav HTML and cookie banners.

## Why it matters now

Traditional SEO is optimised for Googlebot: structured HTML, meta tags, `sitemap.xml`. That still matters. But AI answer engines operate differently — they read content, extract claims, and attribute sources. If your content is buried in JavaScript-rendered markup or scattered across CMS API payloads, you lose.

The practical effect: a site that publishes `llms.txt` + markdown twins is more likely to be cited with a source link in an AI answer. A site that doesn't is more likely to have its content silently consumed and paraphrased without attribution.

This is still early. The `llms.txt` standard was proposed in 2024 and adoption is growing but not universal. The cost of adding it is near-zero; the upside is being one of the early attributed sources in your niche.

## What you need for AEO-native publishing

`llms.txt` alone isn't enough. A complete AEO surface requires:

| Output | What it does |
|---|---|
| `llms.txt` | Tells LLMs what your site contains and where the clean markdown is |
| `/raw/<slug>.md` twins | Clean markdown for every post — the actual content LLMs read |
| `JSON-LD` (Article, BreadcrumbList) | Structured data for search engines and AI that parse schema.org |
| `sitemap.xml` | Canonical URL map for all crawlers |
| `feed.xml` (RSS/Atom) | Syndication for aggregators |

All five are build outputs. They should be generated automatically on every publish, not configured manually per post.

## How Glint generates it

Every `glint build` emits the full AEO surface with no per-post configuration:

1. **`llms.txt`** — auto-generated from all published posts, listing canonical URL + raw twin path for each.
2. **`/raw/blog/<slug>.md`** — served from `src/pages/raw/blog/[slug].md.ts`, which reads the Astro content collection and returns the source markdown as a plain `.md` response.
3. **JSON-LD** — `BlogPosting` and `BreadcrumbList` schema.org markup, injected into each post's `<head>` by the layout component.
4. **`sitemap.xml`** — via `@astrojs/sitemap` + `glintSitemap` integration.
5. **`feed.xml`** — via `@astrojs/rss`, built alongside the page routes.

The result is that publishing a new post means writing a markdown file. The AEO surface updates automatically on the next build.

## Checking your site's AEO coverage

If you're not using Glint, audit your current setup:

- Visit `yourdomain.com/llms.txt` — does it exist?
- Visit `yourdomain.com/raw/blog/<any-slug>.md` — is there a clean markdown twin?
- View source on any post and search for `application/ld+json` — is there a `BlogPosting` block?

If any of these are missing, your content is harder for AI answer engines to read and attribute.

## Start here

The `llms.txt` standard is documented at [llmstxt.org](https://llmstxt.org). Glint's implementation is in `src/pages/llms.txt.ts` and `src/pages/raw/blog/[slug].md.ts` in every scaffolded site — you can read the source and adapt it to any Astro project.

If you want the full AEO surface without building it yourself, `glint new --dir myblog --brand "Your Brand" --domain yourdomain.com` scaffolds a buildable Astro site with all five outputs wired up from day one.
