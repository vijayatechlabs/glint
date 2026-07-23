/**
 * Remark plugin: resolve `{{cta:id}}` and `{{ref:id}}` shortcodes from
 * `data/links.json` into markdown links at build time.
 *
 * Usage in posts (plain .md, no MDX needed):
 *   Check out {{cta:demo}} to see it in action.
 *   See {{ref:pricing}} for details.
 *
 * `data/links.json` format:
 *   {
 *     "demo":    { "url": "https://example.com/demo",    "label": "Try the demo" },
 *     "pricing": { "url": "https://example.com/pricing", "label": "See pricing" }
 *   }
 *
 * The `cta:` prefix renders a bold CTA link: **[Try the demo](url)**
 * The `ref:` prefix renders a regular inline link: [See pricing](url)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface LinksRegistry {
  [id: string]: {
    url: string;
    label: string;
    type?: string; // optional: "cta" | "ref" (overrides prefix)
  };
}

/** Load the links registry from data/links.json. Keys are normalized to lowercase. */
export function loadLinksRegistry(dir: string): LinksRegistry {
  const p = join(dir, "data", "links.json");
  if (!existsSync(p)) return {};
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as Record<string, any>;
    // Normalize all keys to lowercase for case-insensitive lookup.
    const normalized: LinksRegistry = {};
    for (const [key, val] of Object.entries(raw)) {
      normalized[key.toLowerCase()] = val;
    }
    return normalized;
  } catch {
    return {};
  }
}

/**
 * Find broken link references: IDs used in content but not in links.json.
 * Returns array of { file, id, type } for each broken reference.
 */
export function findBrokenLinkRefs(
  body: string,
  registry: LinksRegistry,
): Array<{ id: string; type: string }> {
  const broken: Array<{ id: string; type: string }> = [];
  const seen = new Set<string>();
  for (const m of body.matchAll(/\{\{(cta|ref):([a-z0-9_-]+)\}\}/gi)) {
    const type = m[1]!.toLowerCase();
    const id = m[2]!;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!registry[id.toLowerCase()]) broken.push({ id, type });
  }
  return broken;
}

/**
 * Create a remark plugin factory that resolves link shortcodes.
 * Pass `linksDir` as the project root (where data/links.json lives).
 */
export function remarkResolveLinks(linksDir: string) {
  const registry = loadLinksRegistry(linksDir);

  return function transformer(tree: any): void {
    visitTextNodes(tree, (node: any) => {
      if (typeof node.value !== "string") return;
      node.value = node.value.replace(
        /\{\{(cta|ref):([a-z0-9_-]+)\}\}/gi,
        (_match: string, type: string, id: string) => {
          const entry = registry[id.toLowerCase()];
          if (!entry) return `[missing link: ${id}]`;
          const label = entry.label || id;
          const url = entry.url;
          if (type.toLowerCase() === "cta") {
            return `**[${label}](${url})**`;
          }
          return `[${label}](${url})`;
        },
      );
    });
  };
}

/** Walk a remark AST (mdast) and call fn on every text node. */
function visitTextNodes(tree: any, fn: (node: any) => void): void {
  function walk(node: any): void {
    if (node.type === "text") fn(node);
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  }
  walk(tree);
}
