/**
 * Detection of leaked AI-generation scaffolding ("Meta Description:", "SEO Slug:",
 * "Alt Text:", "SEO-Optimized Title:" …). Shared by the importer (which strips it)
 * and `glint doctor` (which fails the build on it). One regex, one source of truth.
 *
 * Each label must end in a colon (with an optional short qualifier like
 * "(for SEO snippet)") so we never strip or flag legitimate prose.
 */
export const SCAFFOLDING_LINE_RE =
  /^\s*\**\s*(meta description|seo[-\s]*optimized\s*title|seo\s*title|seo\s*slug|slug|alt text|focus key(?:word|phrase)|suggested\s*(?:title|slug)|h1|title)\b[^:：\n]{0,40}[:：]/i;

export function lineIsScaffolding(line: string): boolean {
  return SCAFFOLDING_LINE_RE.test(line);
}
