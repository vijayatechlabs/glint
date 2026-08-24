import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  preferredSourceHost,
  preferredSourcesEnabled,
  PREFERRED_SOURCES_SCRIPT,
  PREFERRED_SOURCES_BUTTON_ATTR,
} from "./preferred-sources.js";

describe("preferredSourceHost", () => {
  it("treats an apex domain as a distinct source", () => {
    const info = preferredSourceHost("example.com");
    assert.equal(info.host, "example.com");
    assert.equal(info.path, "/");
    assert.equal(info.hostEligible, true);
    assert.equal(info.pathIsDistinctSource, true);
    assert.equal(
      info.deeplink,
      "https://www.google.com/preferences/source?q=example.com",
    );
  });

  it("treats a subdomain as eligible (Search Central example)", () => {
    const info = preferredSourceHost("https://code.example.com/");
    assert.equal(info.host, "code.example.com");
    assert.equal(info.pathIsDistinctSource, true);
    assert.equal(info.hostEligible, true);
  });

  it("does not treat a subdirectory as its own source", () => {
    const info = preferredSourceHost("https://www.example.com/blog");
    assert.equal(info.host, "www.example.com");
    assert.equal(info.path, "/blog");
    assert.equal(info.pathIsDistinctSource, false);
    assert.equal(
      info.deeplink,
      "https://www.google.com/preferences/source?q=www.example.com",
    );
  });

  it("maps the live Glint marketing path to the agency host, not /glint", () => {
    const info = preferredSourceHost("https://vijayatechlabs.com/glint");
    assert.equal(info.host, "vijayatechlabs.com");
    assert.equal(info.path, "/glint");
    assert.equal(info.pathIsDistinctSource, false);
  });

  it("exports the official script and button attribute", () => {
    assert.equal(
      PREFERRED_SOURCES_SCRIPT,
      "https://news.google.com/swg/js/v1/publisher.js",
    );
    assert.equal(PREFERRED_SOURCES_BUTTON_ATTR, "google-add-preferred-source-btn");
  });
});

describe("preferredSourcesEnabled", () => {
  it("defaults on when the block is omitted", () => {
    assert.equal(preferredSourcesEnabled(undefined), true);
  });

  it("honors an explicit opt-out", () => {
    assert.equal(preferredSourcesEnabled({ enabled: false }), false);
  });
});
