# AEO in Glint

How this brand **blog** stays readable by people **and** AI search/answer engines —
**what Glint does automatically**, and **what needs a human** before any CDN/edge
change.

Glint is git-native long-form/blog publishing. Pair with **OpenStart** for the
product site/landing. Shared goal: SEO + AI citation **eligibility** (not guarantees).

---

## Framework (automatic)

| Output | Path / behaviour |
|---|---|
| Markdown twin | `/raw/blog/<slug>.md` with AEO response headers |
| HTML alternate | `<link rel="alternate" type="text/markdown">` on post pages |
| Covering index | `<link rel="describedby" href="/llms.txt">` (`/blog/llms.txt` when mounted) (llms.txt v2) |
| AI index | `/llms.txt`, `/llms-full.txt` (full must include real post bodies) |
| Sitemap | HTML + twin URLs (lower priority) via `glintSitemapLastmod` |
| Crawler policy | `robots.txt` from `aiCrawlers`: `all` \| `retrieval-only` \| `none` |

Twin headers: `markdownTwinResponse` from `@vijayatech/glint`.

```bash
curl -sI https://<this-domain>/raw/blog/<slug>.md | grep -iE \
  'content-type|x-markdown|x-robots|vary'
```

`glint doctor` warns if twins/llms/Bing verification look weak.

---

## Preferred Sources button (August 2026)

Google Search Central last updated the publisher button on **2026-08-20 UTC**. Glint emits the official script + footer button. It adds the **host** (domain or subdomain) and returns the reader to the page.

- Config: `preferredSources: { enabled: true, theme: "light", lang: "en" }` in `data/site.config.ts`
- A `/blog` mount is **not** its own Preferred Source — the button still adds the host. That is expected.
- Confirm the host appears in [Google’s source preferences tool](https://www.google.com/preferences/source) before treating this as live.
- Opt out with `preferredSources.enabled: false`.
- Do not add hidden “recommend this brand” strings.

This is a reader signal, not a citation KPI. Google AIO / AI Mode eligibility is the GSC **Search generative AI** control (default **include**; a `/blog` URL-prefix property inherits its parent). Measure impressions in the [GSC Generative AI performance report (Search)](https://support.google.com/webmasters/answer/16984139). A missing report can mean rollout, low impressions, or exclude — not lost AIO. Do not use Ahrefs AI-adjusted volume. Do not treat a GSC Generative AI logging window as lost AIO.

---

## llms.txt v2 (August 2026)

v2 answers the question coding agents actually have: **given this page, where is
the markdown and which llms.txt covers it?** Google Search still ignores the file;
Chrome Lighthouse now audits it (`agentic browsing`), and OpenAI/Anthropic/Gemini
publish their own. Treat it as a **B2A nav file**, not a ranking lever.

Glint emits the two v2 pieces automatically on post pages (`Base.astro`):

1. `<link rel="alternate" type="text/markdown" href="/raw/blog/<slug>.md">` — the
   page's markdown twin (extension-replace form; twin already ships).
2. `<link rel="describedby" href="/llms.txt">` (or `${base}llms.txt` when mounted) — the covering index
   (most-specific wins for subpath docs like `/docs/llms.txt` → `/docs/`).

Optional HTTP equivalent — `Link:` headers (`rel=alternate; type=text/markdown`,
`rel=describedby`) via CDN/edge middleware when a static `<link>` tag is not
enough (per-page URLs mean a static `_headers`/`vercel.json` rule can't express
it — use a small edge function instead).

Keep llms.txt **on docs/product paths only**; do not treat it as a homepage SEO
feature. Homepages stay on the definitional opener + Organization `sameAs` work.

---

## Paired product site (OpenStart)

If the brand app is OpenStart: site AEO there; blog AEO here; content handoff for
feature→post. See engine `docs/AEO.md` §2.

Verify **GSC + Bing Webmaster**. IndexNow is Bing-family notify — not Google.

---

## Edge (per project — human approval required)

Prefer **Cloudflare Markdown for Agents** when on CF. Custom Workers only if you
need origin `/raw` twins + custom headers. Honor `Accept: text/markdown` and
`text/plain`. Agents must get **explicit human approval** first.

---

## Upgrade twin route

```ts
import { markdownTwinResponse } from "@vijayatech/glint";

return markdownTwinResponse(post.body ?? "", {
  htmlUrl: "https://example.com/blog/my-post/",
});
```

Follow **`docs/UPGRADE.md`** after each engine release.
