import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { glintOgImage, glintSitemapLastmod, remarkResolveLinks, rehypeHeadingIds } from "@vijayatech/glint";

export default defineConfig({
  site: "https://example.com",
  integrations: [sitemap(), glintSitemapLastmod(), glintOgImage({ brand: "Glint" })],
  markdown: {
    remarkPlugins: [remarkResolveLinks(import.meta.dirname)],
    rehypePlugins: [rehypeHeadingIds()],
  },
});
