/**
 * WordPress (WXR) → Glint importer.
 *
 * Turns a WordPress eXtended RSS export into schema-valid Glint Markdown files.
 * Deliberately conservative: it imports everything as `draft: true`, strips the
 * leaked AI-generation scaffolding we found in naam.one's export, cleans slugs,
 * captures featured images, and emits a redirects map + a content-audit report
 * so a human can triage before anything goes live.
 *
 * WXR is a stable format, so this hand-parser (split on <item> + CDATA-aware
 * field picks) is reliable and dependency-light. turndown does HTML→Markdown.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import TurndownService from "turndown";
import { stringify } from "yaml";
import { lineIsScaffolding } from "../lib/scaffolding.js";

export interface ImportResult {
  posts: number;
  drafts: number;
  redirects: number;
  mediaDownloaded: number;
  mediaFailed: string[];
  audit: AuditRow[];
}

interface AuditRow {
  slug: string;
  words: number;
  flags: string[];
  action: string;
}

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

/** CDATA-aware single-field extractor. */
function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  return m[1]!.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

/** Clean a WP post_name into a safe kebab slug. Strips emoji/non-ASCII and the
 *  single-digit "-2/-3" suffixes WP appends on slug collisions (NOT 4-digit
 *  years, which are an editorial concern, not a slug one). */
function cleanSlug(raw: string, title: string): string {
  let s = decodeURIComponent(raw || "").toLowerCase();
  s = s.normalize("NFKD").replace(/[^\x00-\x7F]/g, ""); // drop emoji/diacritics
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  s = s.replace(/-\d$/, ""); // strip WP collision suffix (-2/-3/-4)
  if (!s) {
    s = title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return s;
}

/** Remove leaked generation scaffolding (Meta Description:/SEO Slug:/Alt Text:)
 *  and a leading line that just repeats the title. Returns [clean, hadLeak]. */
function stripScaffolding(md: string, title: string): [string, boolean] {
  const before = md;
  let out = md
    .split("\n")
    // Drop lines that are leaked generation scaffolding (shared detector).
    .filter((line) => !lineIsScaffolding(line))
    .join("\n");
  // drop a leading echo of the title (with or without markdown heading marks)
  const norm = (x: string) => x.replace(/[#*\s]/g, "").toLowerCase();
  const lines = out.split("\n");
  while (lines.length && norm(lines[0]!) === "") lines.shift();
  if (lines.length && norm(lines[0]!) === norm(title)) lines.shift();
  out = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return [out, before !== md || out !== md];
}

function firstSentences(text: string, maxWords = 32): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const words = clean.split(" ").slice(0, maxWords).join(" ");
  return words.length < clean.length ? words.replace(/[,;:]?$/, "") + "…" : words;
}

function ext(url: string): string {
  const m = url.split("?")[0]!.match(/\.([a-z0-9]+)$/i);
  return m ? m[1]!.toLowerCase() : "png";
}

export async function importWordpress(opts: {
  wxr: string;
  outRoot: string; // the naam-blog repo root
  collection?: string; // default "blog"
  base?: string; // public base path, default "/blog"
}): Promise<ImportResult> {
  const collection = opts.collection ?? "blog";
  const base = opts.base ?? "/blog";
  const xml = readFileSync(opts.wxr, "utf8");
  const blocks = xml.split("<item>").slice(1).map((s) => s.split("</item>")[0]!);

  // 1) attachment map: id -> url (to resolve featured images)
  const attachments = new Map<string, string>();
  for (const b of blocks) {
    if (pick(b, "wp:post_type") === "attachment") {
      const id = pick(b, "wp:post_id");
      const url = pick(b, "wp:attachment_url");
      if (id && url) attachments.set(id, url);
    }
  }

  const contentDir = join(opts.outRoot, "content", collection);
  const mediaDir = join(opts.outRoot, "public", "media");
  const docsDir = join(opts.outRoot, "docs");
  mkdirSync(contentDir, { recursive: true });
  mkdirSync(mediaDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });

  const redirects: Array<{ from: string; to: string }> = [];
  const audit: AuditRow[] = [];
  const mediaFailed: string[] = [];
  let mediaDownloaded = 0;
  let count = 0;

  for (const b of blocks) {
    if (pick(b, "wp:post_type") !== "post") continue;
    count++;

    const title = pick(b, "title");
    const rawSlug = pick(b, "wp:post_name");
    const slug = cleanSlug(rawSlug, title);
    const date = pick(b, "wp:post_date");
    const link = pick(b, "link");
    const html = pick(b, "content:encoded");
    const excerpt = pick(b, "excerpt:encoded");
    const tags = [
      ...b.matchAll(/domain="post_tag"[^>]*>([^<]+)<\/category>/g),
    ].map((m) => m[1]!.trim());

    // body → markdown → de-scaffold
    let md = td.turndown(html);
    const [clean, hadLeak] = stripScaffolding(md, title);
    md = clean;

    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = plain ? plain.split(" ").length : 0;
    // Summary must not echo leaked scaffolding, so derive it from the cleaned
    // markdown body (not the raw HTML).
    const cleanText = md
      .replace(/^#+\s*/gm, "")
      .replace(/[*_`>#]/g, " ")
      .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    const excerptClean = excerpt
      ? stripScaffolding(excerpt.replace(/<[^>]+>/g, " "), title)[0]
      : "";
    const summary =
      (excerptClean && firstSentences(excerptClean)) ||
      firstSentences(cleanText) ||
      title;

    // featured image
    const thumb = b.match(
      /_thumbnail_id\]\]>\s*<\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]>/,
    );
    let cover: { src: string; alt: string } | undefined;
    const imgUrl = thumb ? attachments.get(thumb[1]!) : undefined;
    if (imgUrl) {
      const filename = `${slug}.${ext(imgUrl)}`;
      try {
        const res = await fetch(imgUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(join(mediaDir, filename), buf);
        cover = { src: `${base}/media/${filename}`, alt: title };
        mediaDownloaded++;
      } catch (e) {
        mediaFailed.push(`${slug}: ${imgUrl} (${(e as Error).message})`);
      }
    }

    // frontmatter (schema-valid; everything lands as a draft for review)
    const frontmatter: Record<string, unknown> = {
      title,
      slug,
      summary,
      tags,
      publishedAt: date ? new Date(date.replace(" ", "T")).toISOString() : new Date().toISOString(),
      visibility: "public",
      draft: true,
    };
    if (cover) frontmatter.cover = cover;

    const file = `---\n${stringify(frontmatter)}---\n\n${md}\n`;
    writeFileSync(join(contentDir, `${slug}.md`), file);

    // redirect from the original WP URL path → new mounted path
    let fromPath = "/" + (rawSlug || slug) + "/";
    try {
      fromPath = new URL(link).pathname;
    } catch { /* keep fallback */ }
    const to = `${base}/${slug}/`;
    if (fromPath !== to) redirects.push({ from: fromPath, to });

    // title/body mismatch: does the body's first heading actually deliver the
    // promised title? Low word-overlap → the body is generic/mismatched filler.
    const firstHeading = (md.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? "").toLowerCase();
    const sig = (s: string) =>
      new Set(
        s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3),
      );
    const tw = sig(title);
    const overlap = [...tw].filter((w) => firstHeading.includes(w)).length;
    const titleMismatch = tw.size > 2 && overlap / tw.size < 0.34;

    // audit flags + suggested action
    const flags: string[] = [];
    if (hadLeak) flags.push("scaffolding-leak");
    if (titleMismatch) flags.push("title-mismatch");
    if (/\b20\d\d\b/.test(title)) flags.push("stale-year");
    if (cleanSlug(rawSlug, title) !== rawSlug) flags.push("slug-changed");
    if (words < 600) flags.push("thin");
    if (!cover) flags.push("no-cover");
    const action =
      flags.includes("scaffolding-leak") || flags.includes("title-mismatch")
        ? "REWRITE"
        : flags.includes("stale-year")
          ? "REFRESH"
          : flags.includes("thin")
            ? "REVIEW (thin)"
            : "KEEP + voice edit";
    audit.push({ slug, words, flags, action });
  }

  // emit redirects.json
  writeFileSync(
    join(opts.outRoot, "redirects.json"),
    JSON.stringify(redirects, null, 2) + "\n",
  );

  // emit content audit report
  const rows = audit
    .sort((a, b) => a.action.localeCompare(b.action))
    .map(
      (r) =>
        `| \`${r.slug}\` | ${r.words} | ${r.flags.join(", ") || "—"} | **${r.action}** |`,
    )
    .join("\n");
  const report =
    `# naam.one — Content Audit (auto-generated by glint import)\n\n` +
    `All ${count} posts imported as **drafts**. Triage below, rewrite to the ` +
    `voice guide (\`docs/brand-voice.md\`), then flip \`draft: false\`.\n\n` +
    `> \`title-mismatch\` is a first-heading heuristic — it over-flags posts ` +
    `whose body opens with a generic heading. Confirm against the body before ` +
    `acting. Several bodies are off-topic or near-duplicate AI filler; prefer ` +
    `regenerating fresh on-brand articles over salvaging them.\n\n` +
    `| Slug | Words | Flags | Suggested action |\n|---|---|---|---|\n${rows}\n`;
  writeFileSync(join(docsDir, "CONTENT-AUDIT.md"), report);

  return {
    posts: count,
    drafts: count,
    redirects: redirects.length,
    mediaDownloaded,
    mediaFailed,
    audit,
  };
}
