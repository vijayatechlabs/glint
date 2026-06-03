import rss from "@astrojs/rss";
import { site } from "../../data/site.config";
import { publicPosts } from "../posts";

export async function GET(context) {
  const posts = await publicPosts();
  return rss({
    title: site.brand,
    description: site.seo.defaultDescription || `${site.brand} blog`,
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.publishedAt,
      link: `/blog/${p.id}/`,
    })),
  });
}
