import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blog as blogSchema } from "@vijayatech/glint/schema";

// Single source of truth: the engine's blog schema. `glint doctor` validates the
// same shape; this gives Astro its types and loads Markdown from content/blog/.
// When the engine adds a field, `pnpm update @vijayatech/glint` picks it up here
// automatically — no manual sync needed.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/blog" }),
  schema: blogSchema,
});

export const collections = { blog };
