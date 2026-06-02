import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Glint reference site. `site` is the canonical origin; a real brand sets this
// to its domain (and `base` to "/blog" when mounted onto an app).
export default defineConfig({
  site: "https://example.com",
  integrations: [sitemap()],
});
