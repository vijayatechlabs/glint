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
  for (const m of readFileSync(p, "utf8").matchAll(/^\-\s*([a-z0-9-]+)\b/gim)) set.add(m[1]!);
  return set;
}

/** A heading extracted from markdown body for Table of Contents. */
export interface TocHeading {
  depth: number; // 2 = h2, 3 = h3
  text: string;
  id: string;    // slugified anchor
}

/**
 * Extract h2/h3 headings from raw markdown for TOC rendering.
 * IDs match `rehypeHeadingIds` (same slugify + duplicate suffix -1, -2, …).
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = markdown.split("\n");
  let inFence = false;
  const seen = new Map<string, number>();

  for (const line of lines) {
    // Track fenced code blocks to avoid extracting headings from code.
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    const depth = m[1]!.length;
    const text = m[2]!.trim().replace(/[`*_~\[\]]/g, "").replace(/\(.*?\)/g, "").trim();
    const baseId = slugify(text);
    if (!baseId) continue;
    const count = seen.get(baseId) ?? 0;
    const id = count > 0 ? `${baseId}-${count}` : baseId;
    seen.set(baseId, count + 1);
    headings.push({ depth, text, id });
  }
  return headings;
}

/** Slugify heading text to a URL-safe anchor ID (shared with rehypeHeadingIds). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Minimal Markdown → HTML for RSS `content:encoded`.
 * Covers headings, paragraphs, bold/italic, links, code, lists — no new deps.
 * Not a full CommonMark implementation; enough for feed aggregators.
 */
export function markdownToHtmlBasic(md: string): string {
  if (!md.trim()) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;
  let fenceBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const text = inline(para.join(" ").trim());
    if (text) out.push(`<p>${text}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!listType) return;
    out.push(listType === "ul" ? "</ul>" : "</ol>");
    listType = null;
  };
  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (inFence) {
        out.push(`<pre><code>${fenceBuf.join("\n").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>`);
        fenceBuf = [];
        inFence = false;
      } else {
        flushPara();
        flushList();
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      fenceBuf.push(line);
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flushPara();
      flushList();
      const d = h[1]!.length;
      out.push(`<h${d}>${inline(h[2]!.trim())}</h${d}>`);
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ul) {
      flushPara();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
        out.push("<ul>");
      }
      out.push(`<li>${inline(ul[1]!)}</li>`);
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ol) {
      flushPara();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
        out.push("<ol>");
      }
      out.push(`<li>${inline(ol[1]!)}</li>`);
      continue;
    }

    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  if (inFence && fenceBuf.length) {
    out.push(`<pre><code>${fenceBuf.join("\n").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>`);
  }
  return out.join("\n");
}
