# Play: Review Content

Use this play to review a drafted post for accuracy, style, and brand voice. This play must be run twice: once by Claude and once by Codex as a cross-check.

## Input Context
- Read `content/blog/<slug>.md`.
- Read `docs/blog-review-checklist.md`.
- Read `docs/brand-voice.md`.

## Instructions
1. Run `pnpm glint doctor --strict` in the repository root. If it fails with errors, they must be resolved.
2. Verify the draft against all `[human]` checks in `docs/blog-review-checklist.md`:
   - Brand voice alignment (no AI fluff/words).
   - Accuracy & sourcing (all claims cited correctly).
   - AEO layout (answer-first, hierarchy, tables, FAQ).
   - SEO metadata (summary, tags, category).
3. Write your review results into `docs/reviews/<slug>.md` using this format:
   ```markdown
   # Review for <slug> (<reviewer-name>)

   ## Status
   - [ ] Doctor Strict check green
   - [ ] Brand voice compliance
   - [ ] AEO structure & answers
   - [ ] Sourcing & links verified

   ## Findings
   <Detailed bulleted list of issues or improvements>
   ```
4. Revise the post content if minor fixes are needed, or provide feedback for revision. Leave git commit/push to the caller unless they explicitly asked you to handle it.
