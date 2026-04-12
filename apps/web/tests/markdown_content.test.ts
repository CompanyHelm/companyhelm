import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownContent } from "../src/components/markdown_content";

test("renders GitHub-flavored markdown tables with transcript-safe styling", () => {
  const html = renderToStaticMarkup(createElement(MarkdownContent, {
    content: `| Name | Value |
| --- | --- |
| Alpha | 1 |
| Beta | 2 |`,
  }));

  assert.match(html, /overflow-x-auto/);
  assert.match(html, /<table/);
  assert.match(html, /<th[^>]*>Name<\/th>/);
  assert.match(html, /<th[^>]*>Value<\/th>/);
  assert.match(html, /<td[^>]*>Alpha<\/td>/);
  assert.match(html, /<td[^>]*>2<\/td>/);
});
