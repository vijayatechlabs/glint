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
