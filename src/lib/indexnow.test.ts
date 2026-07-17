import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateKey,
  resolveKeyLocation,
  expandTwins,
  twinUrlForHtml,
  filterUrlsForHost,
  getUrlForPost,
  type IndexNowConfig,
} from "./indexnow.js";

const standalone: IndexNowConfig = {
  baseUrl: "https://example.com",
  domain: "example.com",
  mount: "",
  deployTarget: "cf-pages",
  key: "abcdef12-3456-7890",
  keyPath: "root",
};

const mounted: IndexNowConfig = {
  baseUrl: "https://example.com/blog",
  domain: "example.com",
  mount: "/blog",
  deployTarget: "coolify",
  key: "abcdef12-3456-7890",
  keyPath: "root",
};

const mountedBaseKey: IndexNowConfig = {
  ...mounted,
  keyPath: "base",
};

describe("validateKey", () => {
  it("accepts valid keys", () => {
    assert.equal(validateKey("abcd1234"), true);
    assert.equal(validateKey("a".repeat(128)), true);
  });
  it("rejects short or invalid", () => {
    assert.equal(validateKey("short"), false);
    assert.equal(validateKey("bad_key!!"), false);
  });
});

describe("resolveKeyLocation", () => {
  it("root key uses origin even when baseUrl has a path", () => {
    const loc = resolveKeyLocation(mounted);
    assert.equal(loc.url, "https://example.com/abcdef12-3456-7890.txt");
    assert.equal(loc.filePath, "abcdef12-3456-7890.txt");
  });
  it("base key is under mount", () => {
    const loc = resolveKeyLocation(mountedBaseKey);
    assert.equal(loc.url, "https://example.com/blog/abcdef12-3456-7890.txt");
    assert.equal(loc.filePath, "blog/abcdef12-3456-7890.txt");
  });
  it("standalone root", () => {
    const loc = resolveKeyLocation(standalone);
    assert.equal(loc.url, "https://example.com/abcdef12-3456-7890.txt");
  });
});

describe("getUrlForPost / twins", () => {
  it("standalone blog URL + twin", () => {
    const html = getUrlForPost(standalone, "blog", "content/blog/hello.md", {
      slug: "hello",
    });
    assert.equal(html, "https://example.com/blog/hello/");
    assert.equal(twinUrlForHtml(html, standalone), "https://example.com/raw/blog/hello.md");
  });
  it("mounted URL + twin", () => {
    const html = getUrlForPost(mounted, "blog", "content/blog/hello.md", {
      slug: "hello",
    });
    assert.equal(html, "https://example.com/blog/hello/");
    assert.equal(twinUrlForHtml(html, mounted), "https://example.com/blog/raw/blog/hello.md");
  });
  it("expandTwins pairs both", () => {
    const out = expandTwins(["https://example.com/blog/hello/"], standalone);
    assert.deepEqual(out, [
      "https://example.com/blog/hello/",
      "https://example.com/raw/blog/hello.md",
    ]);
  });
});

describe("filterUrlsForHost", () => {
  it("rejects foreign hosts", () => {
    const { valid, rejected } = filterUrlsForHost(standalone, [
      "https://example.com/a/",
      "https://evil.com/a/",
    ]);
    assert.equal(valid.length, 1);
    assert.equal(rejected.length, 1);
  });
});

describe("injectTwinUrlsIntoSitemaps", () => {
  it("is exported and no-ops on empty list", async () => {
    const { injectTwinUrlsIntoSitemaps } = await import("./indexnow.js");
    assert.equal(injectTwinUrlsIntoSitemaps("/nonexistent-dist-xyz", []), 0);
  });
});
