import rss from "@astrojs/rss";
import { publicPosts } from "../posts";

export async function GET(context) {
  const posts = await publicPosts();
  return rss({
    title: "Glint Blog",
    description: "The Glint reference blog.",
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.publishedAt,
      link: `/blog/${p.id}/`,
    })),
  });
}
