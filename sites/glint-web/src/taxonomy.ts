import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Reads the human-managed taxonomy registries (data/categories.md, data/tags.md)
// at build time so archive pages can show real names + descriptions (SEO/AEO copy).
export interface Term {
  slug: string;
  name: string;
  description: string;
}

function read(file: string): string {
  const p = join(process.cwd(), "data", file);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

/** data/categories.md: `## Name` + `slug: x` + a description paragraph. */
export function categories(): Map<string, Term> {
  const map = new Map<string, Term>();
  for (const block of read("categories.md").split(/^##\s+/m).slice(1)) {
    const lines = block.split("\n");
    const name = lines[0]!.trim();
    const slugLine = lines.find((l) => /^slug:/i.test(l.trim()));
    const slug = slugLine
      ? slugLine.split(":")[1]!.trim()
      : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const description = lines
      .slice(1)
      .filter((l) => l.trim() && !/^slug:/i.test(l.trim()))
      .join(" ")
      .trim();
    map.set(slug, { slug, name, description });
  }
  return map;
}

/** data/tags.md: `- slug — description`. */
export function tags(): Map<string, Term> {
  const map = new Map<string, Term>();
  for (const m of read("tags.md").matchAll(/^-\s*([a-z0-9-]+)\s*(?:—|–|--)?\s*(.*)$/gim)) {
    map.set(m[1]!, { slug: m[1]!, name: m[1]!, description: (m[2] ?? "").trim() });
  }
  return map;
}

export function termOf(map: Map<string, Term>, slug: string): Term {
  return map.get(slug) ?? { slug, name: slug, description: "" };
}
