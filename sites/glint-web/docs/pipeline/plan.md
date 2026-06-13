# Play: Content Planning

Use this play to ideate new content ideas, propose headlines, and add them to the backlog.

## Input Context
- Read `data/content-strategy.md` to align with core pillars, target audience, and content guidelines.
- Read `data/content-plan.md` to see existing topics and backlog status.
- Check for **product briefs handed over from app/site projects** (via OpenStart's
  content handoff): a `CONTENT-INBOX.md` file at the repo root, and any open GitHub
  issues labelled `content`. These are real shipped features waiting to become posts.

## Instructions
1. **Drain the intake first.** For each unprocessed brief in `CONTENT-INBOX.md`
   (`Status: new`) and each open `content`-labelled issue, fold it into
   `data/content-plan.md` under `## Backlog` as an idea — map the brief's **Feature**
   to a working Title, pick the matching **Pillar** and **Type**, and carry its
   **Angle**, **Audience**, and **Keyword** into the note:
   `- [idea] <Pillar> · <Type> · <Title> — <angle>; from <source> app (kw: <keyword>)`
   Then mark the inbox entry `Status: planned` (don't delete it) so it isn't
   re-imported; for an issue, comment that it's queued. Skip anything that
   duplicates an existing post or backlog item — sharpen the angle instead.
2. Scan the existing posts under `content/` and `data/content-plan.md` to avoid duplicating topics.
3. Brainstorm a shortlist of 3–5 specific, benefit-led titles matching one of the brand's core pillars. Include the drained product briefs alongside your own ideas.
4. For each proposed title, define:
   - The core Pillar it supports.
   - The Content Type (e.g., guide, comparison, listicle).
   - The main value hook / angle.
5. Output the shortlist of ideas for the human to review.
6. Once the human selects/approves a title, add it to `data/content-plan.md` under `## Approved (ready to draft)` using the format:
   `- [approved] Pillar · Type · Title — angle/note`

Do NOT draft any posts or create files under `content/` during this step.
