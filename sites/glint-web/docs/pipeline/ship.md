# Play: Ship / Local Gate

Use this play to perform the final local check before opening a PR.

## Instructions
1. Run `pnpm glint doctor --strict` to verify no strict validation errors exist.
2. Run `pnpm glint status` to see the publishing pipeline overview.
3. Verify that the draft has been committed to a clean branch `content/<slug>`.
4. Ensure the draft status remains `draft: true`. **Never** flip `draft: false` automatically.
5. Print or display `docs/blog-review-checklist.md` so the human reviewer can do the final sign-off.
6. Prompt the human to run `pnpm glint preview` locally, review the rendered draft, and then push/open a Pull Request manually when it is ready.
