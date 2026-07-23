/**
 * Rehype plugin: inject `id` attributes on h2/h3 headings so TOC anchor
 * links resolve. Uses the same slugification as `extractHeadings` in
 * `src/lib/content.ts` to guarantee matching IDs.
 *
 * Register in astro.config.ts:
 *   markdown: { rehypePlugins: [rehypeHeadingIds()] }
 */
import { slugify } from "./content.js";

/** Extract text content from a hast node tree (recursive). */
function textContent(node: any): string {
  if (node.type === "text") return node.value ?? "";
  if (Array.isArray(node.children)) {
    return node.children.map(textContent).join("");
  }
  return "";
}

/**
 * Rehype plugin that adds `id` to h2 and h3 elements.
 * Compatible with Astro's rehype plugin interface.
 */
export function rehypeHeadingIds() {
  return function transformer(tree: any): void {
    const seen = new Map<string, number>();

    function walk(node: any): void {
      if (
        node.type === "element" &&
        (node.tagName === "h2" || node.tagName === "h3")
      ) {
        const text = textContent(node).trim();
        let id = slugify(text);
        if (!id) return;

        // Deduplicate: append -1, -2, etc. for repeated headings.
        const count = seen.get(id) ?? 0;
        if (count > 0) id = `${id}-${count}`;
        seen.set(slugify(text), count + 1);

        if (!node.properties) node.properties = {};
        node.properties.id = id;
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child);
      }
    }

    walk(tree);
  };
}
