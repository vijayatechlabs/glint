/**
 * @vijayatech/glint — public entry.
 *
 * Brands import the content contract from here to wire their Astro content
 * collections. The Astro integration (build pipeline, AEO emitters, link graph)
 * is added next and will also be exported from this module.
 */
export * from "./content/schema.js";
export { glintSitemap, glintSitemapLastmod } from "./integration/sitemap.js";
export type { GlintSitemapOptions } from "./integration/sitemap.js";
export { glintIndexNow } from "./integration/indexnow.js";
export { glintOgImage } from "./integration/og-image.js";
export { remarkResolveLinks, loadLinksRegistry, findBrokenLinkRefs } from "./lib/remark-links.js";
export { rehypeHeadingIds } from "./lib/rehype-heading-ids.js";
export { extractHeadings, slugify, markdownToHtmlBasic } from "./lib/content.js";
export type { TocHeading } from "./lib/content.js";
export {
  markdownTwinHeaders,
  markdownTwinResponse,
  AEO_TWIN_HEADER_MARKERS,
} from "./lib/aeo-twin.js";
export type { MarkdownTwinHeaderOptions } from "./lib/aeo-twin.js";
export {
  preferredSourceHost,
  preferredSourcesEnabled,
  PREFERRED_SOURCES_SCRIPT,
  PREFERRED_SOURCES_DEEPLINK_BASE,
  PREFERRED_SOURCES_BUTTON_ATTR,
  PREFERRED_SOURCES_MARKERS,
} from "./lib/preferred-sources.js";
export type {
  PreferredSourceInfo,
  PreferredSourcesConfig,
  PreferredSourcesTheme,
} from "./lib/preferred-sources.js";
