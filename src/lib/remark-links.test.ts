import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findBrokenLinkRefs, type LinksRegistry } from "./remark-links.js";

describe("findBrokenLinkRefs", () => {
  it("is case-insensitive against registry keys", () => {
    const reg: LinksRegistry = {
      demo: { url: "https://ex.com", label: "Demo" },
    };
    assert.deepEqual(findBrokenLinkRefs("See {{cta:Demo}}", reg), []);
    assert.equal(findBrokenLinkRefs("See {{cta:missing}}", reg).length, 1);
  });
});
