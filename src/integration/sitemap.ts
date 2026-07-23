import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export interface GlintSitemapOptions {
  /** Output filename without extension, e.g. "sitemap-blog". Defaults to "sitemap-index". */
  sitemapName: string;
}

/**
 * Astro integration that copies Astro's generated `sitemap-index.xml` to a
 * custom filename after the build. Use this when the blog is mounted at a
 * sub-path (e.g. /blog) and the parent site's proxy or robots.txt needs a
 * non-conflicting sitemap name like `sitemap-blog.xml`.
 *
 * Add it AFTER `@astrojs/sitemap` in the integrations array:
 *   integrations: [sitemap(), glintSitemap({ sitemapName: "sitemap-blog" })]
 */
export function glintSitemap(options: GlintSitemapOptions): {
  name: string;
  hooks: { "astro:build:done": (args: { dir: URL }) => Promise<void> };
} {
  return {
    name: "glint-sitemap",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const distDir = fileURLToPath(dir);
        const source = join(distDir, "sitemap-index.xml");
        const target = join(distDir, `${options.sitemapName}.xml`);
        if (!existsSync(source)) {
          console.warn(`[glint-sitemap] sitemap-index.xml not found in dist — skipping.`);
          return;
        }
        copyFileSync(source, target);
        console.log(`[glint-sitemap] copied sitemap-index.xml → ${options.sitemapName}.xml`);
      },
    },
  };
}

/** Normalize a URL path for lastmod lookup (ensure trailing slash). */
export function normalizeSitemapPath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

/**
 * Look up lastmod for a sitemap loc path against keys produced by content scan.
 * Matches exact path, then suffix (standalone `/blog/slug/` vs mounted `/slug/`).
 */
export function matchLastmod(
  pathname: string,
  lastmodMap: Map<string, string>,
): string | undefined {
  const path = normalizeSitemapPath(pathname);
  const exact = lastmodMap.get(path);
  if (exact) return exact;
  for (const [key, val] of lastmodMap) {
    if (path.endsWith(key) || path === key.slice(0, -1)) return val;
  }
  // Last path segment only (mounted flat under arbitrary base).
  const segs = path.split("/").filter(Boolean);
  if (segs.length >= 1) {
    const last = `/${segs[segs.length - 1]}/`;
    if (lastmodMap.has(last)) return lastmodMap.get(last);
  }
  if (segs.length >= 2) {
    const two = `/${segs[segs.length - 2]}/${segs[segs.length - 1]}/`;
    if (lastmodMap.has(two)) return lastmodMap.get(two);
  }
  return undefined;
}

/** Build slug-path → YYYY-MM-DD map from content root (testable pure-ish helper). */
export function buildLastmodMapFromContent(contentRoot: string): Map<string, string> {
  const lastmodMap = new Map<string, string>();
  if (!existsSync(contentRoot)) return lastmodMap;
  for (const entry of readdirSync(contentRoot, { recursive: true }) as string[]) {
    if (!entry.endsWith(".md")) continue;
    const parts = entry.split(/[\\/]/);
    if (parts.length < 2) continue;
    const collection = parts[0]!;
    try {
      const text = readFileSync(join(contentRoot, entry), "utf8");
      const fm = text.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const data = (parse(fm[1]!) as Record<string, unknown>) ?? {};
      const slug = String(data.slug ?? parts[parts.length - 1]!.replace(/\.md$/, ""));
      if (data.draft === true) continue;
      if (data.visibility === "members") continue;
      const updatedAt = data.updatedAt ?? data.publishedAt;
      if (!updatedAt) continue;
      const d = updatedAt instanceof Date ? updatedAt : new Date(String(updatedAt));
      if (isNaN(d.getTime())) continue;
      const iso = d.toISOString().slice(0, 10);
      lastmodMap.set(`/${collection}/${slug}/`, iso);
      lastmodMap.set(`/${slug}/`, iso);
    } catch {
      /* skip unreadable */
    }
  }
  return lastmodMap;
}

/**
 * Post-build integration that injects `<lastmod>` into every sitemap `<url>`
 * element by reading `updatedAt ?? publishedAt` from content frontmatter.
 * Zero-config — uses existing content files, no new schema fields required.
 *
 * Must be registered AFTER `@astrojs/sitemap` and `glintSitemap`.
 */
export function glintSitemapLastmod(): {
  name: string;
  hooks: { "astro:build:done": (args: { dir: URL }) => Promise<void> };
} {
  return {
    name: "glint-sitemap-lastmod",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const distDir = fileURLToPath(dir);
        const projectDir = process.cwd();
        const lastmodMap = buildLastmodMapFromContent(join(projectDir, "content"));
        if (lastmodMap.size === 0) return;

        let sitemapFiles: string[];
        try {
          sitemapFiles = readdirSync(distDir).filter(
            (f: string) => f.startsWith("sitemap") && f.endsWith(".xml"),
          );
        } catch {
          return;
        }

        let totalPatched = 0;
        for (const file of sitemapFiles) {
          const fullPath = join(distDir, file);
          const content = readFileSync(fullPath, "utf8");
          if (/<sitemapindex[\s>]/i.test(content)) continue;

          let modified = false;
          const patched = content.replace(
            /<url>\s*<loc>([^<]+)<\/loc>(\s*<lastmod>[^<]*<\/lastmod>)?\s*/gi,
            (match, loc: string, existingLastmod: string | undefined) => {
              try {
                const path = new URL(loc.trim()).pathname;
                const lastmod = matchLastmod(path, lastmodMap);
                if (lastmod) {
                  modified = true;
                  totalPatched++;
                  if (existingLastmod) {
                    return match.replace(existingLastmod, `<lastmod>${lastmod}</lastmod>`);
                  }
                  return `<url>\n    <loc>${loc.trim()}</loc>\n    <lastmod>${lastmod}</lastmod>\n    `;
                }
              } catch {
                /* invalid URL */
              }
              return match;
            },
          );

          if (modified) writeFileSync(fullPath, patched, "utf8");
        }

        if (totalPatched > 0) {
          console.log(
            `[glint-sitemap-lastmod] Injected <lastmod> into ${totalPatched} URL(s).`,
          );
        }
      },
    },
  };
}
