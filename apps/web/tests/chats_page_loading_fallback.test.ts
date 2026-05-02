import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatsPageFallback } from "../src/pages/chats/chats_page_loading_fallback";

test("chats page fallback mirrors the loaded layout without duplicate loading copy", () => {
  const markup = renderToStaticMarkup(createElement(ChatsPageFallback));

  assert.match(markup, /aria-busy="true"/u);
  assert.match(markup, /Loading chats/u);
  assert.match(markup, /data-testid="chats-loading-transcript"/u);
  assert.match(markup, /data-testid="chats-loading-list"/u);
  assert.ok(
    markup.indexOf('data-testid="chats-loading-transcript"') < markup.indexOf('data-testid="chats-loading-list"'),
    "desktop fallback should place the transcript skeleton before the chat list skeleton",
  );
  assert.doesNotMatch(markup, /Loading agents and sessions/u);
  assert.doesNotMatch(markup, /Loading selected chat/u);
  assert.doesNotMatch(markup, /border-dashed/u);
});
