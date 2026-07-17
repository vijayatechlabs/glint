import { fileURLToPath } from "node:url";
import {
  readIndexNowConfig,
  resolveKeyLocation,
  writeIndexNowKeyFile,
  validateKey,
  collectPageUrlsFromSitemaps,
  twinsForHtmlUrls,
  injectTwinUrlsIntoSitemaps,
} from "../lib/indexnow.js";

/**
 * Astro integration: after build, write IndexNow key file into dist and inject
 * markdown twin URLs into the sitemap (priority 0.5). Does **not** HTTP-submit.
 */
export function glintIndexNow(): {
  name: string;
  hooks: { "astro:build:done": (args: { dir: URL }) => Promise<void> };
} {
  return {
    name: "glint-indexnow",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const projectDir = process.cwd();
        const distDir = fileURLToPath(dir);

        const cfg = readIndexNowConfig(projectDir);
        if (!cfg) {
          // Still try twin injection if we can read baseUrl-only — skip if no config
          console.warn(
            "[glint-indexnow] IndexNow key not configured in data/site.config.ts — skipping key file.",
          );
        } else if (!validateKey(cfg.key)) {
          console.warn(
            `[glint-indexnow] Invalid IndexNow key (8–128 [A-Za-z0-9-]) — skipping key file.`,
          );
        } else {
          const keyLoc = resolveKeyLocation(cfg);
          try {
            writeIndexNowKeyFile(distDir, cfg.key, keyLoc.filePath);
            console.log(`[glint-indexnow] Wrote key file → ${keyLoc.filePath}`);
          } catch (err) {
            console.error(`[glint-indexnow] Key write failed: ${(err as Error).message}`);
          }
        }

        // Twin sitemap injection needs baseUrl/mount from config
        if (cfg) {
          try {
            const pages = collectPageUrlsFromSitemaps(distDir);
            const htmlPosts = pages.filter(
              (u) => !u.includes("/raw/") && !u.endsWith(".xml") && !u.endsWith(".txt"),
            );
            const twins = twinsForHtmlUrls(htmlPosts, cfg);
            const n = injectTwinUrlsIntoSitemaps(distDir, twins, "0.5");
            if (n > 0) {
              console.log(`[glint-indexnow] Injected ${n} twin URL(s) into sitemap (priority 0.5).`);
            }
          } catch (err) {
            console.warn(`[glint-indexnow] Twin sitemap inject skipped: ${(err as Error).message}`);
          }
        }
      },
    },
  };
}
