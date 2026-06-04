# Play: Draft Content

Use this play to draft a chosen approved title.

## Input Context
- Read `docs/content-playbook.md` and `docs/brand-voice.md`.
- Read `data/categories.md` and `data/tags.md`.

## Instructions
1. If you are not already on the correct content branch, create or switch to `content/<slug>` based on the title's slug.
2. Create the file `content/blog/<slug>.md`.
3. Fill in the frontmatter contract EXACTLY as follows, ensuring `draft: true`:
   ```yaml
   ---
   title: "Chosen Approved Title"
   summary: "1–2 sentence value hook that doubles as the meta description"
   tags: [tag1, tag2]       # Select 3–5 tags from data/tags.md
   category: category-slug  # Select one category slug from data/categories.md
   publishedAt: YYYY-MM-DDT00:00:00.000Z
   visibility: public
   draft: true
   ---
   ```
4. Draft the body following the AEO structure:
   - **Answer-first:** Open with a bold `**TL;DR —**` or direct 2-3 sentence answer.
   - **Question-based headings:** Use `##` questions readers actually ask.
   - **Data structure:** Include at least one table, list of steps, or comparison matrix.
   - **FAQ section:** Add 2-3 FAQ questions at the bottom.
   - **Sourcing:** Cite reputable sources with links. Never invent statistics.
5. Ensure the tone matches the voice in `docs/brand-voice.md` and contains NO AI filler words.
6. Leave the changes ready for review. Do not commit or push automatically unless the caller explicitly asked you to handle git.
