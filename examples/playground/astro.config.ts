import { defineConfig } from "astro/config";

// AEO: sitemap.xml is hand-rolled at src/pages/sitemap.xml.ts instead of via
// @astrojs/sitemap, so raw Markdown twins (/raw/blog/<slug>.md) can be listed
// alongside their HTML counterparts at a distinct, lower priority — the
// default integration only sees routes it renders, not sibling twin routes.
// See docs/DECISIONS.md for the full rationale.
export default defineConfig({
  site: "https://example.com",
  integrations: [],
});
