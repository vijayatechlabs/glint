import { defineConfig } from "astro/config";
import { glintOgImage, remarkResolveLinks, rehypeHeadingIds } from "@vijayatech/glint";

// Sitemap is hand-rolled at src/pages/sitemap.xml.ts so /raw/blog/*.md twins
// are listed next to HTML posts (see docs/DECISIONS.md). @astrojs/sitemap is
// intentionally omitted here to avoid a second sitemap file.
export default defineConfig({
  site: "https://example.com",
  integrations: [glintOgImage({ brand: "Glint" })],
  markdown: {
    remarkPlugins: [remarkResolveLinks(import.meta.dirname)],
    rehypePlugins: [rehypeHeadingIds()],
  },
});
