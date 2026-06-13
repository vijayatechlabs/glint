# Brand Voice — Glint

## The voice in one sentence

Direct, technically precise, and confident without being dismissive — the tone of
a senior engineer explaining a real architectural decision, not a product marketer
listing bullets.

## Characteristics

**Direct.** Lead with the answer. No "great question" preambles, no "in today's
world" scene-setting. The title makes a claim; the first paragraph proves it.

**Precise.** Name the actual thing. "llms.txt", "JSON-LD", "Astro content
collections" — not "structured data formats" or "modern static frameworks." Readers
who care are technical; vagueness signals you don't know the detail.

**Honest.** If Glint doesn't do something, say so. The comparison pages name the
tools that do it better for that use case. Pretending everything is a Glint win
destroys trust.

**Concise.** One idea per paragraph. Tables beat prose for comparisons. Code beats
prose for "how it works." If a sentence can be cut without losing meaning, cut it.

## What to avoid

- Generic AI-content openers ("In the rapidly evolving landscape of...")
- Passive constructions that obscure who does what ("content is published by...")
- Metaphors that don't add precision (e.g. "blazing fast" without numbers)
- Hedging on things Glint actually does ("may help", "can sometimes")
- Trailing upsell paragraphs that read like a product brochure

## Tone by content type

| Type | Tone | Example first line |
|---|---|---|
| Comparison | Neutral, specific | "Hugo builds a 500-page site in under a second. Glint can't match that." |
| AEO education | Explanatory, cites evidence | "llms.txt is a plain-text file that tells AI crawlers what your site contains." |
| Tutorial | Step-by-step, no assumed context | "Run `glint onboard --app ../myapp --apply` from the glint-web directory." |
| Feature deep dive | Architectural, shows the code | "Every `glint build` runs `doctor` first. Here's what it checks." |

## Formatting rules

- H2 for main sections, H3 for subsections. No H4 unless the section genuinely
  has four levels of nesting (rare).
- Tables for any comparison of three or more items.
- Code blocks for every CLI command, file path, and config snippet.
- No bullet lists longer than five items — convert to a section instead.
- End with a single clear next step, not a list of "if you liked this" links.
