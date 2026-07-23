import type { APIContext } from "astro";
import { site } from "../../data/site.config";

// SEO + AEO: per-brand AI crawler policy.
// Playground uses hand-rolled /sitemap.xml (includes twin URLs).
const RETRIEVAL_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Perplexity-User",
  "PerplexityBot",
  "ClaudeBot",
];

const TRAINING_BOTS = [
  "GPTBot",
  "CCBot",
  "Google-Extended",
  "anthropic-ai",
  "ClaudeBot-Training",
];

function buildRobotsTxt(sitemapUrl: string, policy: string): string {
  const lines = ["User-agent: *", "Allow: /", ""];
  if (policy === "retrieval-only") {
    lines.push("# AI retrieval bots (surface your content in answers)");
    for (const bot of RETRIEVAL_BOTS) lines.push(`User-agent: ${bot}`, "Allow: /", "");
    lines.push("# AI training bots (blocked by brand policy)");
    for (const bot of TRAINING_BOTS) lines.push(`User-agent: ${bot}`, "Disallow: /", "");
  } else if (policy === "none") {
    lines.push("# AI bots (all blocked by brand policy)");
    for (const bot of [...RETRIEVAL_BOTS, ...TRAINING_BOTS]) {
      lines.push(`User-agent: ${bot}`, "Disallow: /", "");
    }
  }
  lines.push(`Sitemap: ${sitemapUrl}`, "");
  return lines.join("\n");
}

export async function GET(context: APIContext) {
  const sitemap = new URL("/sitemap.xml", context.site).href;
  const policy = (site as { aiCrawlers?: string }).aiCrawlers ?? "all";
  const body = buildRobotsTxt(sitemap, policy);
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
