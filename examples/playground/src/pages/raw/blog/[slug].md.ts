import type { APIContext } from "astro";
import { publicPosts } from "../../../posts";

// AEO: markdown twins — serve the raw source body at /raw/blog/<slug>.md as
// plain text, inline, so both browsers and AI agent fetchers render/read it
// directly instead of triggering a download prompt for an unrecognized type.
export async function getStaticPaths() {
  const posts = await publicPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export async function GET({ props }: APIContext) {
  const { post } = props as { post: { body: string } };
  return new Response(post.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline",
    },
  });
}
