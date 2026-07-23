/**
 * `glint index` — notify Google of URL add/update/delete via the
 * Web Search Indexing API. Complements `glint indexnow` (Bing/Yandex/Naver).
 *
 * Usage:
 *   glint index --since-sha <prev> [--sha <current>] [--dir .] [--dry-run]
 *   glint index --bootstrap [--dir .] [--dry-run]
 */
import { join } from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  readGoogleIndexingConfig,
  loadServiceAccountKey,
  submitToGoogle,
  deltaToNotifications,
  prioritizeNotifications,
  type UrlNotification,
} from "../../lib/google-indexing.js";
import {
  readIndexNowConfig,
  computeUrlDelta,
  collectPageUrlsFromSitemaps,
  filterUrlsForHost,
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

export async function runIndex(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  const booleanFlags = new Set<string>();

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith("--")) {
      const name = a.slice(2);
      if (name === "dry-run" || name === "bootstrap" || name === "full" || name === "json-log" || name === "force") {
        booleanFlags.add(name);
      } else {
        flags.set(name, args[++i] ?? "");
      }
    }
  }

  const dir = flags.get("dir") ?? process.cwd();
  const dryRun = booleanFlags.has("dry-run");
  const jsonLog = booleanFlags.has("json-log");
  const bootstrap = booleanFlags.has("bootstrap") || booleanFlags.has("full");
  const force = booleanFlags.has("force");

  const log = (msg: string, data?: unknown) => {
    if (jsonLog) console.log(JSON.stringify({ msg, data }));
    else console.log(msg, data !== undefined ? data : "");
  };
  const errLog = (msg: string) => {
    if (jsonLog) console.error(JSON.stringify({ error: msg }));
    else console.error(`ERROR: ${msg}`);
  };

  // ── Gate: Google Web Search Indexing API is documented for JobPosting /
  // BroadcastEvent structured data ONLY — not general BlogPosting / article URLs.
  // Refuse unless --force is passed (for future supported content types).
  if (!force) {
    errLog(
      "Google Web Search Indexing API is documented for JobPosting / BroadcastEvent only.\n" +
        "       It does NOT support general BlogPosting / article URLs.\n" +
        "       For Google discovery use: GSC sitemap submission + URL Inspection + <lastmod>.\n" +
        "       Pass --force to override (only if your site has JobPosting/BroadcastEvent content).",
    );
    process.exitCode = 1;
    return;
  }

  // 1. Read config.
  const giConfig = readGoogleIndexingConfig(dir);
  if (!giConfig || !giConfig.serviceAccountKey) {
    errLog(
      "googleIndexing.serviceAccountKey is empty in data/site.config.ts.\n" +
        "       Run `glint setup indexing` for guided setup.",
    );
    process.exitCode = 1;
    return;
  }

  // 2. Load SA key file.
  const sa = loadServiceAccountKey(giConfig.serviceAccountKey, dir);
  if (!sa) {
    errLog(
      `Service account key file not found or invalid: ${giConfig.serviceAccountKey}\n` +
        "       Run `glint setup indexing` to reconfigure.",
    );
    process.exitCode = 1;
    return;
  }

  // 3. Read IndexNow config (for baseUrl/domain/mount — shared URL computation).
  const inCfg = readIndexNowConfig(dir);
  if (!inCfg) {
    errLog("IndexNow config not found — needed for baseUrl/domain. Ensure data/site.config.ts is complete.");
    process.exitCode = 1;
    return;
  }

  // 4. Compute URL delta.
  let notifications: UrlNotification[] = [];
  const sha = flags.get("sha") || gitRev(dir, "HEAD");
  const sinceSha = flags.get("since-sha") || flags.get("since-ref") || "";

  if (bootstrap) {
    log("Bootstrap/full: collecting page URLs from dist sitemaps.");
    const distDir = join(dir, "dist");
    if (!existsSync(distDir)) {
      errLog(`No dist/ at ${distDir}. Build first.`);
      process.exitCode = 1;
      return;
    }
    const urls = collectPageUrlsFromSitemaps(distDir);
    log(`Collected ${urls.length} URL(s) from sitemaps.`);
    notifications = urls.map((url) => ({ url, type: "URL_UPDATED" as const }));
  } else if (sinceSha && sha) {
    log(`Git delta ${sinceSha}..${sha}`);
    const delta = computeUrlDelta(dir, sinceSha, sha, inCfg);
    log(`Delta: +${delta.added.length} ~${delta.updated.length} -${delta.deleted.length}`);
    notifications = deltaToNotifications(delta.added, delta.updated, delta.deleted);
  } else {
    errLog(
      "Durable cursor required: pass --since-sha <prev-deploy-sha> (and optional --sha).\n" +
        "       Use --bootstrap only for intentional recovery.",
    );
    process.exitCode = 1;
    return;
  }

  if (notifications.length === 0) {
    log("No URLs to notify.");
    return;
  }

  // 5. Host-filter (same gate as IndexNow).
  const allUrls = notifications.map((n) => n.url);
  const { valid, rejected } = filterUrlsForHost(inCfg, allUrls);
  if (rejected.length) {
    log(`Filtered ${rejected.length} URL(s) with host mismatch.`);
  }
  const validSet = new Set(valid);
  notifications = notifications.filter((n) => validSet.has(n.url));

  if (notifications.length === 0) {
    log("No valid URLs after host filtering.");
    return;
  }

  // 6. Prioritize within daily quota.
  notifications = prioritizeNotifications(notifications);

  if (dryRun) {
    log(`[dry-run] Would submit ${notifications.length} notification(s):`);
    for (const n of notifications) log(`  ${n.type}  ${n.url}`);
    return;
  }

  // 7. Submit.
  log(`Submitting ${notifications.length} notification(s) to Google Indexing API…`);
  const result = await submitToGoogle(sa, notifications);

  if (result.failed > 0) {
    errLog(`${result.failed} notification(s) failed. Check errors above.`);
    process.exitCode = 1;
  } else {
    log(
      `All ${result.succeeded} notification(s) accepted. Advance durable cursor to this deploy SHA after success.`,
    );
    if (sha) log(`Suggested cursor SHA: ${sha}`);
  }
}
