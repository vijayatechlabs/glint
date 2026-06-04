/**
 * @vijayatech/glint — public entry.
 *
 * Brands import the content contract from here to wire their Astro content
 * collections. The Astro integration (build pipeline, AEO emitters, link graph)
 * is added next and will also be exported from this module.
 */
export * from "./content/schema.js";
export { glintSitemap } from "./integration/sitemap.js";
export type { GlintSitemapOptions } from "./integration/sitemap.js";
