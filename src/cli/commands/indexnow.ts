import { join } from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  readIndexNowConfig,
  validateKey,
  resolveKeyLocation,
  computeUrlDelta,
  expandTwins,
  gatePublicUrls,
  submitIndexNow,
  collectPageUrlsFromSitemaps,
  filterUrlsForHost,
  twinUrlForHtml,
} from "../../lib/indexnow.js";

function gitRev(dir: string, rev: string): string {
  const r = spawnSync("git", ["rev-parse", rev], {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) return "";
  return (r.stdout ?? "").trim();
}

/**
 * RSS fallback: only items whose <pubDate> is after `since` (ISO).
 * If since is empty, refuse (must not dump full feed by default).
 */
async function fetchRssUrlsSince(baseUrl: string, sinceIso: string): Promise<string[]> {
  const rssUrl = `${baseUrl.replace(/\/$/, "")}/rss.xml`;
  const since = Date.parse(sinceIso);
  if (Number.isNaN(since)) {
    console.warn(`[IndexNow] Invalid --since for RSS fallback: ${sinceIso}`);
    return [];
  }

  try {
    const res = await fetch(rssUrl);
    if (!res.ok) return [];
    const xml = await res.text();
    const urls: string[] = [];
    for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
      const item = match[1]!;
      const link = item.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim();
      const pub =
        item.match(/<pubDate>([^<]+)<\/pubDate>/i)?.[1]?.trim() ??
        item.match(/<dc:date>([^<]+)<\/dc:date>/i)?.[1]?.trim();
      if (!link || !pub) continue;
      const t = Date.parse(pub);
      if (!Number.isNaN(t) && t > since) urls.push(link);
    }
    return urls;
  } catch (err) {
    console.warn(`[IndexNow] RSS fetch failed (${rssUrl}): ${(err as Error).message}`);
    return [];
  }
}

export async function runIndexNow(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  const booleanFlags = new Set<string>();

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--")) {
      const name = a.slice(2);
      if (
        name === "fallback-rss" ||
        name === "bootstrap" ||
        name === "full" ||
        name === "dry-run" ||
        name === "json-log" ||
        name === "skip-gate"
      ) {
        booleanFlags.add(name);
      } else {
        flags.set(name, args[++i] ?? "");
      }
    }
  }

  const dir = flags.get("dir") ?? process.cwd();
  const dryRun = booleanFlags.has("dry-run");
  const jsonLog = booleanFlags.has("json-log");
  const fallbackRss = booleanFlags.has("fallback-rss");
  const bootstrap = booleanFlags.has("bootstrap") || booleanFlags.has("full");
  const skipGate = booleanFlags.has("skip-gate");

  const log = (msg: string, data?: unknown) => {
    if (jsonLog) console.log(JSON.stringify({ msg, data }));
    else console.log(msg, data !== undefined ? data : "");
  };
  const errLog = (msg: string) => {
    if (jsonLog) console.error(JSON.stringify({ error: msg }));
    else console.error(`ERROR: ${msg}`);
  };

  const cfg = readIndexNowConfig(dir);
  if (!cfg) {
    errLog("IndexNow config not found or empty key in data/site.config.ts.");
    process.exitCode = 1;
    return;
  }
  if (!validateKey(cfg.key)) {
    errLog(`IndexNow key invalid (need 8–128 chars [A-Za-z0-9-]).`);
    process.exitCode = 1;
    return;
  }

  const keyLoc = resolveKeyLocation(cfg);
  log(`IndexNow host=${cfg.domain} keyLocation=${keyLoc.url}`);

  let urlsToSubmit: string[] = [];
  const isDeleteMap = new Set<string>();

  const sha = flags.get("sha") || gitRev(dir, "HEAD");
  const sinceSha = flags.get("since-sha") || flags.get("since-ref") || "";

  if (bootstrap) {
    log("Bootstrap/full: collecting page URLs from dist sitemaps (explicit).");
    const distDir = join(dir, "dist");
    if (!existsSync(distDir)) {
      errLog(`No dist/ at ${distDir}. Build first.`);
      process.exitCode = 1;
      return;
    }
    urlsToSubmit = collectPageUrlsFromSitemaps(distDir);
    log(`Collected ${urlsToSubmit.length} sitemap page URL(s).`);
  } else if (fallbackRss) {
    const sinceIso = flags.get("since") ?? "";
    if (!sinceIso) {
      errLog(
        "--fallback-rss requires --since <ISO date> (net-new only). Do not dump the full feed.",
      );
      process.exitCode = 1;
      return;
    }
    log(`RSS fallback: items with pubDate after ${sinceIso}`);
    urlsToSubmit = await fetchRssUrlsSince(cfg.baseUrl, sinceIso);
    log(`RSS yielded ${urlsToSubmit.length} URL(s).`);
  } else if (sinceSha && sha) {
    log(`Git delta ${sinceSha}..${sha}`);
    const delta = computeUrlDelta(dir, sinceSha, sha, cfg);
    log(
      `Delta: +${delta.added.length} ~${delta.updated.length} -${delta.deleted.length}`,
    );
    for (const url of delta.deleted) {
      isDeleteMap.add(url);
      urlsToSubmit.push(url);
    }
    urlsToSubmit.push(...delta.added, ...delta.updated);
  } else {
    errLog(
      "Durable cursor required: pass --since-sha <prev-deploy-sha> (and optional --sha). " +
        "Refusing HEAD~1 default. Use --bootstrap/--full only for intentional recovery, " +
        "or --fallback-rss --since <ISO> for net-new RSS only.",
    );
    process.exitCode = 1;
    return;
  }

  if (urlsToSubmit.length > 0) {
    const before = urlsToSubmit.length;
    const expanded = expandTwins(urlsToSubmit, cfg);
    for (const url of expanded) {
      if (urlsToSubmit.includes(url)) continue;
      const parentCandidates = urlsToSubmit.filter((u) => !u.includes("/raw/"));
      for (const parent of parentCandidates) {
        if (twinUrlForHtml(parent, cfg) === url && isDeleteMap.has(parent)) {
          isDeleteMap.add(url);
        }
      }
    }
    urlsToSubmit = expanded;
    log(`Expanded twins: ${before} → ${urlsToSubmit.length}`);
  }

  const { valid, rejected } = filterUrlsForHost(cfg, urlsToSubmit);
  if (rejected.length) {
    errLog(`${rejected.length} URL(s) host-mismatch (first: ${rejected[0]})`);
    process.exitCode = 1;
    return;
  }
  urlsToSubmit = valid;

  if (urlsToSubmit.length === 0) {
    log("No URLs to submit.");
    return;
  }

  let finalUrls = urlsToSubmit;
  if (!skipGate) {
    log("Gating live HTTP status (redirect: manual)…");
    const adds = urlsToSubmit.filter((u) => !isDeleteMap.has(u));
    const deletes = urlsToSubmit.filter((u) => isDeleteMap.has(u));
    const gatedAdds = adds.length ? await gatePublicUrls(adds, false) : [];
    const gatedDeletes = deletes.length ? await gatePublicUrls(deletes, true) : [];
    finalUrls = [...gatedAdds, ...gatedDeletes];
    log(`Gate: ${finalUrls.length}/${urlsToSubmit.length} verified.`);
  }

  if (finalUrls.length === 0) {
    log("No verified URLs to submit.");
    return;
  }

  if (dryRun) {
    log(`[dry-run] Would submit ${finalUrls.length} URL(s):`, finalUrls);
    return;
  }

  log(`Submitting ${finalUrls.length} URL(s)…`);
  // Prefer URL host from baseUrl for protocol host field
  let host = cfg.domain;
  try {
    host = new URL(cfg.baseUrl).host;
  } catch {
    /* keep domain */
  }

  const success = await submitIndexNow(host, cfg.key, keyLoc.url, finalUrls);
  if (success) {
    log(
      "IndexNow submission finished (200/202 = receipt only). Advance durable cursor (INDEXNOW_PREV_SHA) to this deploy SHA after success.",
    );
    if (sha) log(`Suggested cursor SHA: ${sha}`);
  } else {
    errLog("IndexNow submission failed.");
    process.exitCode = 1;
  }
}
