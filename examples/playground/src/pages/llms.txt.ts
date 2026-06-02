import type { APIContext } from "astro";
import { publicPosts } from "../posts";

// AEO: a plain-text index of canonical URLs + raw markdown twins for AI crawlers.
export async function GET(context: APIContext) {
  const posts = await publicPosts();
  const site = context.site!;
  const lines = [
    "# Glint Blog",
    "",
    "> The Glint reference blog. Markdown twins are linked per post.",
    "",
    "## Posts",
    ...posts.map((p) => {
      const url = new URL(`/blog/${p.id}/`, site).href;
      const raw = new URL(`/raw/blog/${p.id}.md`, site).href;
      return `- [${p.data.title}](${url}): ${p.data.summary} (raw: ${raw})`;
    }),
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
