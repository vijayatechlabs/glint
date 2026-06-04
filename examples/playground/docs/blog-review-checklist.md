# Blog Review Checklist — Glint

The pre-publish gate. A human (or agent) reviews **every** post against this before
it merges and goes live. It is **brand-aware**: most checks point at the docs
onboarding prepared for Glint, so reviewing a post means confirming it matches
*this brand's* voice, keywords, taxonomy, and goals — not a generic standard.

Pairs with:
- `docs/brand-voice.md` — the voice every post is enforced against.
- `data/content-strategy.md` — pillars, target keywords/topics, ICP, goals, cadence.
- `data/categories.md` / `data/tags.md` — the controlled taxonomy.
- `data/links.json` — canonical/shared URLs + CTAs to link to.
- `docs/content-playbook.md` — blog types + AEO structure (how to write).

**[doctor]** items are machine-checked by `glint doctor` (CI fails on them) — just
confirm the run is green. **[human]** items need judgment no validator can make —
spend your attention there.

> A post is ready only when `glint doctor` is green **and** every [human] box is
> honestly ticked. Drafts (`draft: true`) 404 in production until then.

---

## 1. Brand fit — does this belong to Glint?
- [ ] **[human] On-strategy.** Maps to a pillar in `data/content-strategy.md` and
      serves Glint's goal/ICP — not a random topic.
- [ ] **[human] Target keyword/topic.** Targets a primary keyword or question from the
      strategy, and that term reads naturally in the title, the summary, and at least
      one `##` heading. No keyword stuffing, no off-topic terms.
- [ ] **[human] On-voice.** Tone, person, and vocabulary match `docs/brand-voice.md`.
- [ ] **[human] Clear CTA.** Ends with a concrete next step that advances Glint's
      goal (try the product, book a call, read the pillar), linked via
      `data/links.json` — never a dead end.

## 2. Frontmatter contract
- [ ] **[doctor]** Schema valid — `title`, `summary`, `publishedAt` present and typed.
- [ ] **[human] Title** delivers what the body covers — specific, benefit-led, no
      clickbait, no title/body mismatch.
- [ ] **[human] Summary** is a 1–2 sentence value hook; it doubles as the meta
      description, so it must read like one.
- [ ] **[doctor] Category** — one kebab-case slug from `data/categories.md`.
- [ ] **[doctor] Tags** — from `data/tags.md` (reuse before inventing; ~3–5).
- [ ] **[human] Author** resolves to `data/team.json` (E-E-A-T: name a real author).
- [ ] **[doctor] Cover** `alt` present + descriptive. **[human]** `cover.src` points
      at a real asset and the `alt` truly describes it.
- [ ] **[human] SEO overrides** (`seo.title`/`seo.description`) set only when they
      should differ from `title`/`summary`.
- [ ] **[doctor]** No leaked scaffolding or unfilled placeholders in the body.

## 3. AEO formatting — so answer engines can quote it
- [ ] **[human] Answer-first.** Opens with a bold `**TL;DR —**` (or equally direct
      first 2–3 sentences) stating the conclusion.
- [ ] **[human] Question-based headings** matching what readers actually ask.
- [ ] **[human] Self-contained sections** — each answers one thing fully; no "as
      mentioned above."
- [ ] **[human] Extractable data** — at least one table, ordered step list, or
      comparison matrix.
- [ ] **[human] Logical heading hierarchy** — no skipped levels.
- [ ] **[human] FAQ** near the end: 2–3 specific long-tail questions answered directly.
- [ ] **[human] Freshness** — time-sensitive claims carry a date / "as of {year}"; no
      decaying fact stated as permanent.

## 4. SEO fundamentals
- [ ] **[human] Internal linking.** Links to >=2 related Glint posts and the
      relevant product/landing page; descriptive anchor text, not "click here". Use
      `data/links.json` for shared URLs so one change updates every post.
- [ ] **[doctor] Links resolve.** Broken internal links are errors; a published post
      linking to a draft is flagged.
- [ ] **[human] No duplicate / cannibalizing post.** Not a near-duplicate of existing
      content — scan `content/` and `data/content-plan.md`. If it overlaps an existing
      post, merge or sharpen the angle/keyword. (`doctor` catches duplicate *slugs*;
      overlapping *topics* are your call.)
- [ ] **[human] No URL break on rename.** A changed slug has a `redirects.json` entry.
- [ ] **[human] Publish scheduling.** Shipping a batch? `publishedAt` is **staggered**
      (sequential dates per the cadence in `data/content-strategy.md`) — don't stamp
      10 posts with the same timestamp. Future-dated posts stay `draft: false` with a
      future `publishedAt` so the daily rebuild flips them live on the day.

## 5. Brand voice & fatal sins — reasons to block the merge
- [ ] **[human] No AI-speak** — zero *delve, tapestry, landscape, unleash,
      revolutionize, unlock, beacon, realm, testament, in today's fast-paced world*.
- [ ] **[human] No filler intro** — gets to the point; no throat-clearing.
- [ ] **[human] Concrete over abstract** — claims grounded in real, named examples
      (and Glint's own stack / cases where natural), not hand-waving.

## 6. Accuracy & sourcing
- [ ] **[human] Verified stats.** Every figure links to a specific reputable source,
      or is softened to a general statement. Never invent numbers.
- [ ] **[human] Pricing caveat.** Currency figures carry "checked as of {year}" + an
      inline link to the vendor's official pricing page.
- [ ] **[human] Sources section** — bulleted, linking to direct URLs (the exact page),
      not generic homepages.

## 7. Grammar & mechanics
- [ ] **[human] No typos** (e.g. *qualifer* -> *qualifier*).
- [ ] **[human] Subject-verb agreement** + consistent tense.
- [ ] **[human] Logical flow** — definitions precede the comparisons that use them.

---

## How to use this
1. Open the post's PR — its preview deploy renders the draft (`noindex` banner).
2. Confirm `glint doctor` is green -> every [doctor] item is cleared at once.
3. Walk the [human] items against the rendered post **and** the Markdown source.
4. Block on any §5 fatal sin, unsourced §6 claim, or a duplicate/scheduling issue.
5. Approve -> merge -> the build publishes and emits the full SEO/AEO surface.

> Onboarding generates this file for Glint. The brand specifics live in the docs
> above, not here — so if the voice, keywords, categories, or CTAs change, update
> *those* docs and every review stays current; the checklist keeps pointing at them.
