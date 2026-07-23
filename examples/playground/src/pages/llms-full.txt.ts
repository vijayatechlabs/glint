import type { APIContext } from "astro";
import { site } from "../../data/site.config";
import { publicPosts } from "../posts";

// AEO: full-content markdown file for AI engines (llmstxt.org full variant).
const MAX_BYTES = 500_000;

export async function GET(context: APIContext) {
  const posts = await publicPosts();
  const base = context.site!;

  const sections: string[] = [
    `# ${site.brand}`,
    "",
    `> ${site.seo.defaultDescription || `${site.brand} blog`}`,
    "",
    `Full content feed. Individual raw twins at ${new URL(`/raw/blog/`, base).href}`,
    "",
  ];

  let totalBytes = Buffer.byteLength(sections.join("\n"), "utf-8");
  let truncated = false;

  for (const p of posts) {
    const url = new URL(`/blog/${p.id}/`, base).href;
    const body = p.body ?? "";
    const entry = [
      "## " + p.data.title,
      "",
      `URL: ${url}`,
      `Published: ${p.data.publishedAt.toISOString()}`,
      p.data.updatedAt ? `Updated: ${p.data.updatedAt.toISOString()}` : "",
      p.data.tags.length > 0 ? `Tags: ${p.data.tags.join(", ")}` : "",
      p.data.author ? `Author: ${p.data.author}` : "",
      "",
      body,
      "",
      "---",
      "",
    ]
      .filter((l) => l !== "")
      .join("\n");

    const entryBytes = Buffer.byteLength(entry, "utf-8");
    if (totalBytes + entryBytes > MAX_BYTES) {
      sections.push(
        `<!-- Truncated: ${posts.length - posts.indexOf(p)} more posts omitted.`,
        `     Full individual posts at ${url} or raw twins. -->`,
      );
      truncated = true;
      break;
    }
    totalBytes += entryBytes;
    sections.push(entry);
  }

  if (truncated) {
    sections.push(
      "",
      `Post count in this file: ${sections.filter((s) => s.startsWith("## ")).length} of ${posts.length}.`,
    );
  }

  return new Response(sections.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
