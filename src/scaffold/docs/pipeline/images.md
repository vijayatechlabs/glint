# Play: Generate Images

Use this play to generate cover and inline images for a drafted post.

## Input Context
- Read the draft file `content/blog/<slug>.md`.

## Instructions
1. Use **Gemini Imagen / Nano Banana** to generate visual assets for the post:
   - A cover image representing the post's core message.
   - Inline images supporting complex steps, charts, or concepts if necessary.
2. Save generated images to `public/media/<slug>/` (e.g. `cover.png`, `step1.png`).
3. Describe each image in detail to write a **real `alt` text** that explains the content and relevance of the image.
4. Update the frontmatter of `content/blog/<slug>.md` with the image metadata:
   ```yaml
   cover: { src: "/media/<slug>/cover.png", alt: "Descriptive alt text" }
   images:
     - { src: "/media/<slug>/step1.png", alt: "Descriptive alt text" }
   ```
5. Leave the images and frontmatter changes ready for review. Do not commit or push automatically unless the caller explicitly asked you to handle git.
