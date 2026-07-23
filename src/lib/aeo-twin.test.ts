import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { markdownTwinHeaders, AEO_TWIN_HEADER_MARKERS } from "./aeo-twin.js";

describe("markdownTwinHeaders", () => {
  it("sets Glint AEO twin headers", () => {
    const h = markdownTwinHeaders("# Hello\n\nWorld", {
      htmlUrl: "https://example.com/blog/hello/",
    });
    assert.equal(h["Content-Type"], "text/markdown; charset=utf-8");
    assert.equal(h["Content-Disposition"], "inline");
    assert.equal(h.Link, `<https://example.com/blog/hello/>; rel="canonical"`);
    assert.match(h["X-Robots-Tag"]!, /noindex/);
    assert.match(h["X-Markdown-Tokens"]!, /^[1-9]\d*$/);
    assert.match(h.Vary!, /Accept/i);
    assert.equal(h["X-AEO-Version"], "1.0");
    assert.equal(h["X-Content-Type-Options"], "nosniff");
  });

  it("reports 0 tokens for empty body", () => {
    const h = markdownTwinHeaders("", { htmlUrl: "https://example.com/blog/x/" });
    assert.equal(h["X-Markdown-Tokens"], "0");
  });

  it("exports markers used by doctor", () => {
    assert.ok(AEO_TWIN_HEADER_MARKERS.includes("text/markdown"));
    assert.ok(AEO_TWIN_HEADER_MARKERS.includes("X-Markdown-Tokens"));
  });
});
