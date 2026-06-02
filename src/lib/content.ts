/**
 * Shared content access for the engine: read frontmatter, list posts, and parse
 * the taxonomy registries. Used by `glint doctor` (and, later, build/status).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface Post {
  collection: string;
  file: string; // path relative to content/
  slug: string;
  data: Record<string, unknown>;
  body: string;
}

/** Split a `---`-fenced frontmatter block from the markdown body. */
export function splitFrontmatter(md: string): { data: Record<string, unknown>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: md };
  let data: Record<string, unknown> = {};
  try {
    data = (parse(m[1]!) as Record<string, unknown>) ?? {};
  } catch {
    /* malformed YAML — surfaced by schema validation */
  }
  return { data, body: m[2] ?? "" };
}

/** All posts under a site's content/ dir, with parsed frontmatter. */
export function listPosts(siteDir: string): Post[] {
  const root = join(siteDir, "content");
  if (!existsSync(root)) return [];
  const out: Post[] = [];
  for (const entry of readdirSync(root, { recursive: true }) as string[]) {
    if (!entry.endsWith(".md")) continue;
    const parts = entry.split(/[\\/]/);
    const collection = parts[0]!;
    if (parts.length < 2) continue; // skip stray top-level files
    const { data, body } = splitFrontmatter(readFileSync(join(root, entry), "utf8"));
    const slug = String(data.slug ?? parts[parts.length - 1]!.replace(/\.md$/, ""));
    out.push({ collection, file: entry, slug, data, body });
  }
  return out;
}

/** Category slugs from data/categories.md (`slug: x` lines). */
export function parseCategories(siteDir: string): Set<string> {
  const set = new Set<string>();
  const p = join(siteDir, "data", "categories.md");
  if (!existsSync(p)) return set;
  for (const m of readFileSync(p, "utf8").matchAll(/^slug:\s*([a-z0-9-]+)\s*$/gim)) set.add(m[1]!);
  return set;
}

/** Tag slugs from data/tags.md (`- slug — description` lines). */
export function parseTags(siteDir: string): Set<string> {
  const set = new Set<string>();
  const p = join(siteDir, "data", "tags.md");
  if (!existsSync(p)) return set;
  for (const m of readFileSync(p, "utf8").matchAll(/^-\s*([a-z0-9-]+)\b/gim)) set.add(m[1]!);
  return set;
}
