import type { APIContext } from "astro";
import { publicPosts } from "../posts";

// AEO: hand-rolled sitemap (replaces @astrojs/sitemap — see astro.config.ts)
// so raw Markdown twins can be listed alongside their HTML counterparts at a
// distinct, lower priority. The default integration only sees rendered Astro
// routes, not sibling twin endpoints like /raw/blog/<slug>.md.

interface UrlEntry {
  loc: string;
  lastmod?: Date;
  priority: number;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function entryXml({ loc, lastmod, priority }: UrlEntry): string {
  const lines = [`  <url>`, `    <loc>${xmlEscape(loc)}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod.toISOString()}</lastmod>`);
  lines.push(`    <priority>${priority.toFixed(1)}</priority>`, `  </url>`);
  return lines.join("\n");
}

export async function GET(context: APIContext) {
  const base = context.site!;
  const posts = await publicPosts();

  const entries: UrlEntry[] = [
    { loc: new URL("/", base).href, priority: 1.0 },
    { loc: new URL("/blog/", base).href, priority: 0.8 },
    { loc: new URL("/blog/search/", base).href, priority: 0.3 },
  ];

  // Category/tag archives only render a page when at least one published post
  // uses them (see getStaticPaths in blog/category/[category].astro and
  // blog/tag/[tag].astro) — mirror that grouping so we never list a 404.
  const catSlugs = new Set<string>();
  const tagSlugs = new Set<string>();
  for (const post of posts) {
    if (post.data.category) catSlugs.add(post.data.category);
    for (const t of post.data.tags ?? []) tagSlugs.add(t);
  }
  for (const slug of catSlugs) {
    entries.push({ loc: new URL(`/blog/category/${slug}/`, base).href, priority: 0.5 });
  }
  for (const slug of tagSlugs) {
    entries.push({ loc: new URL(`/blog/tag/${slug}/`, base).href, priority: 0.4 });
  }

  // Canonical HTML posts (0.8) + their raw Markdown twins (0.4) — the AEO
  // pattern: twins are discoverable via sitemap, not only via llms.txt.
  for (const post of posts) {
    const lastmod = post.data.updatedAt ?? post.data.publishedAt;
    entries.push({ loc: new URL(`/blog/${post.id}/`, base).href, lastmod, priority: 0.8 });
    entries.push({ loc: new URL(`/raw/blog/${post.id}.md`, base).href, lastmod, priority: 0.4 });
  }

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map(entryXml),
    `</urlset>`,
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
