import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractHeadings, slugify, markdownToHtmlBasic } from "./content.js";

describe("slugify / extractHeadings", () => {
  it("slugifies heading text", () => {
    assert.equal(slugify("Hello World!"), "hello-world");
  });

  it("extracts h2/h3 and skips code fences", () => {
    const md = `# Title\n\n## First\n\n\`\`\`\n## Not me\n\`\`\`\n\n### Nested\n\n## First\n`;
    const h = extractHeadings(md);
    assert.deepEqual(
      h.map((x) => ({ depth: x.depth, id: x.id })),
      [
        { depth: 2, id: "first" },
        { depth: 3, id: "nested" },
        { depth: 2, id: "first-1" },
      ],
    );
  });
});

describe("markdownToHtmlBasic", () => {
  it("renders headings paragraphs and links", () => {
    const html = markdownToHtmlBasic("## Hello\n\nSee [docs](https://ex.com).\n");
    assert.match(html, /<h2>Hello<\/h2>/);
    assert.match(html, /<a href="https:\/\/ex.com">docs<\/a>/);
  });

  it("renders lists and bold", () => {
    const html = markdownToHtmlBasic("- one\n- **two**\n");
    assert.match(html, /<ul>/);
    assert.match(html, /<strong>two<\/strong>/);
  });
});
