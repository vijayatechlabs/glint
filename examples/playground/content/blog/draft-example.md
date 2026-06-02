---
title: "A Draft (should 404 in production)"
summary: "Used to verify drafts are excluded from the production build."
category: branding
tags: [domains]
publishedAt: 2026-02-01T00:00:00.000Z
draft: true
cover:
  src: /media/draft.png
  alt: "Placeholder cover for a draft post"
---

## This is a draft

It must NOT appear in the production build, sitemap, RSS, llms.txt, or JSON API —
only in `astro dev` / per-PR preview, with a `noindex` banner.
