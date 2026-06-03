# Content Playbook

The shared reference for humans **and** AI agents: pick a blog type, structure it,
and write it so it wins with both readers and **answer engines** (Perplexity,
ChatGPT, Gemini, Google AI Overviews). Pair this with `data/content-strategy.md`
(what to write & why), `docs/brand-voice.md` (how it sounds), and
`data/categories.md` / `data/tags.md` (how it's filed).

You can write **any** type of post. The list below is the proven, curated set —
start here, adapt freely.

## 1. Blog types (and how to structure each)

| Type | Use it for | Structure (the skeleton) |
|---|---|---|
| **Guide (pillar)** | Own a broad topic; hub of a topic cluster | Direct answer → what/why → deep sections → links to cluster posts → FAQ |
| **How-to / Tutorial** | Accomplish a task, step by step | Goal → prerequisites → numbered steps → result → troubleshooting/FAQ |
| **Listicle** | "N ways/ideas/mistakes" — scannable, shareable | Intro (the payoff) → numbered H2 items (each self-contained) → takeaway |
| **Comparison (X vs Y)** | Decision/bottom-funnel ("us vs competitor") | Intro → **comparison table** → criteria sections → who-should-choose-what → verdict |
| **Case study** | Prove outcomes with a real story | Context → challenge → approach → **results (metrics)** → takeaway |
| **Feature explanation / launch** | Explain a product feature or release | What it is → why it matters → how to use (steps) → examples → CTA |
| **Trends** | "X trends in {year}" — time-sensitive | Thesis → each trend (with **data + source**) → what it means → outlook |
| **Industry news / analysis** | React to events (e.g. a premium domain sale) | What happened (sourced, dated) → why it matters → analysis → implication |
| **Tips / best practices** | Quick, actionable advice | Intro → tips (each a clear directive + example) → summary |
| **Glossary / "What is X?"** | Definitions — pure answer-engine fuel | One-sentence definition → expanded explanation → examples → related terms |
| **FAQ / Q&A** | Cluster of real questions on a topic | Short intro → Q&A pairs (question = heading) |

## 2. What answer engines prefer (AEO frameworks)

LLM answer engines retrieve and quote **passages**, not whole pages. Write so any
section can be lifted and cited:

1. **Answer-first (inverted pyramid).** Lead with a direct, self-contained answer
   in the first 2–3 sentences. State the conclusion, then elaborate.
2. **Question-based headings.** Use the real questions people ask as `##`/`###`
   ("How do I choose a startup name?"). Matches query intent and is extractable.
3. **Self-contained chunks.** Each section answers one thing fully — no "as
   mentioned above." A retriever may surface it alone.
4. **Definitive, sourced facts.** Specific numbers, dates, named entities
   (products, companies, prices). Cite sources. Confident > hedged.
5. **Structure the data.** Tables for comparisons, ordered lists for steps,
   bullets for sets. Engines pull tables and lists directly. (Glint also emits
   JSON-LD: Article + Breadcrumb today; FAQ/HowTo where you use those patterns.)
6. **TL;DR / key takeaways.** A short summary block — the most quotable unit.
7. **Freshness for time-sensitive posts.** Dates and "as of {year}"; don't assert
   decaying facts (e.g. "domain X is available") as permanent — frame and link.
8. **Cite your sources.** Link authoritative references; engines favor sourced
   content and may cite you back.
9. **Plain, concise, specific.** Short sentences, no filler/clichés, real examples.
10. **E-E-A-T.** Name an author; bring original data, examples, or a clear POV.

## 3. What to put in the Markdown (the AEO twin)

Glint serves `/raw/<collection>/<slug>.md` — **the Markdown source is exactly what
AI crawlers read** (not the HTML). So write the Markdown to be AEO-perfect; the
HTML and JSON-LD are generated from it.

A strong post's Markdown:

```markdown
---
title: "How to Choose a Startup Name That's Legally Clear and Available"
summary: "Pick a name in an afternoon: brainstorm on meaning, check the trademark
  class, and confirm the .com — here's the exact process."   # = the direct answer + meta
category: naming-strategy
tags: [naming, domains, legal]
publishedAt: 2026-06-03T00:00:00.000Z
author: prasad            # → data/team.json
draft: true
cover: { src: /media/<slug>.png, alt: "describes the image + relevance" }
---

**TL;DR —** <the direct, self-contained answer in 2–3 sentences.>

## What makes a good startup name?
<self-contained answer; specifics, examples>

## Step-by-step: <task>
1. <step>
2. <step>

## <X> vs <Y>
| Criterion | X | Y |
|---|---|---|
| … | … | … |

## FAQ
### <Real question people ask>
<concise answer>

## Sources
- [Source title](https://…)
```

Checklist for every post: direct answer up top · question-based headings ·
self-contained sections · a table or steps where it fits · an FAQ · real `alt`
text · sources for any claim/stat · no decaying "facts" · on brand voice.

## 4. The agent's job

When asked to write, the agent: reads `data/content-strategy.md` (pick a Pillar +
Type), scans existing `content/` to avoid duplication and find gaps, **researches
with its native web search and cites sources**, proposes titles for approval, then
drafts to this playbook + the brand voice + the frontmatter contract — `draft: true`
→ `glint doctor` → PR.
