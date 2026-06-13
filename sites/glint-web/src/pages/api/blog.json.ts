import type { APIContext } from "astro";
import { publicPosts } from "../../posts";

// Decoupled content API — apps/mobile consume the same source as the web pages.
export async function GET(context: APIContext) {
  const posts = await publicPosts();
  const data = posts.map((p) => ({
    slug: p.id,
    url: new URL(`/blog/${p.id}/`, context.site).href,
    ...p.data,
  }));
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
