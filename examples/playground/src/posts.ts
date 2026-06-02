import { getCollection, type CollectionEntry } from "astro:content";

const byNewest = (a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) =>
  b.data.publishedAt.getTime() - a.data.publishedAt.getTime();

/** Posts shown as pages: dev/preview shows drafts; production hides drafts and
 *  not-yet-due scheduled posts. */
export async function pagePosts(): Promise<CollectionEntry<"blog">[]> {
  const now = Date.now();
  const isProd = import.meta.env.PROD;
  const posts = await getCollection("blog", ({ data }) =>
    isProd ? data.draft !== true && data.publishedAt.getTime() <= now : true,
  );
  return posts.sort(byNewest);
}

/** The public surface (feeds, llms.txt, twins, JSON API): always excludes drafts
 *  and future-dated posts, even in dev. */
export async function publicPosts(): Promise<CollectionEntry<"blog">[]> {
  const now = Date.now();
  const posts = await getCollection(
    "blog",
    ({ data }) => data.draft !== true && data.publishedAt.getTime() <= now,
  );
  return posts.sort(byNewest);
}
