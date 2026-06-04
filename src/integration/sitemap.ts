import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
