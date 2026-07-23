import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchLastmod, normalizeSitemapPath, buildTwinUrlsFromContent, parseSiteBaseFromConfig } from "./sitemap.js";

describe("matchLastmod", () => {
  const map = new Map<string, string>([
    ["/blog/hello/", "2026-01-02"],
    ["/hello/", "2026-01-02"],
  ]);

  it("matches standalone blog paths", () => {
    assert.equal(matchLastmod("/blog/hello/", map), "2026-01-02");
    assert.equal(matchLastmod("/blog/hello", map), "2026-01-02");
  });

  it("matches mounted flat slug paths", () => {
    assert.equal(matchLastmod("/hello/", map), "2026-01-02");
  });

  it("matches when base prefix is present", () => {
    assert.equal(matchLastmod("/app/blog/hello/", map), "2026-01-02");
  });

  it("normalizes trailing slash", () => {
    assert.equal(normalizeSitemapPath("/x"), "/x/");
  });
});

describe("parseSiteBaseFromConfig / buildTwinUrlsFromContent", () => {
  it("returns null when site.config missing", () => {
    assert.equal(parseSiteBaseFromConfig("/nonexistent-project-xyz"), null);
    assert.deepEqual(buildTwinUrlsFromContent("/nonexistent-project-xyz"), []);
  });
});
