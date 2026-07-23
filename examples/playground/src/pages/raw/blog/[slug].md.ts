import type { APIContext } from "astro";
import { markdownTwinResponse } from "@vijayatech/glint";
import { publicPosts } from "../../../posts";
import { site } from "../../../../data/site.config";

// AEO: markdown twins at /raw/blog/<slug>.md (headers via markdownTwinResponse).
// On static hosts, public/_headers also sets Content-Type for CDN deploys.
// Content negotiation (Accept / bot UA) is edge-only — see docs/AEO.md.
export async function getStaticPaths() {
  const posts = await publicPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export async function GET({ props }: APIContext) {
  const { post } = props as { post: { id: string; body: string } };
  const base = site.baseUrl.replace(/\/$/, "");
  const mount = "mount" in site ? String((site as { mount?: string }).mount ?? "") : "";
  const htmlUrl =
    mount && mount !== "/"
      ? `${base}/${post.id}/`
      : `${base}/blog/${post.id}/`;

  return markdownTwinResponse(post.body ?? "", { htmlUrl });
}
