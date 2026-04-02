import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentWebFetchTool } from "../src/services/agent/tools/web/fetch.ts";
import { AgentWebToolProvider } from "../src/services/agent/tools/web/provider.ts";
import { AgentWebSearchTool } from "../src/services/agent/tools/web/search.ts";
import { AgentWebToolService } from "../src/services/agent/tools/web/service.ts";

test("AgentWebToolProvider contributes Exa-backed web search and fetch tools", () => {
  const provider = new AgentWebToolProvider({
    async fetchPages() {
      throw new Error("web fetch should stay lazy");
    },
    async searchWeb() {
      throw new Error("web search should stay lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["web_search", "web_fetch"],
  );
});

test("AgentWebSearchTool renders the Exa result excerpts and request details", async () => {
  const searchWeb = vi.fn(async () => {
    return {
      requestId: "req-search",
      results: [{
        publishedDate: "2026-04-01T10:00:00.000Z",
        text: "Result excerpt",
        title: "Search Result Title",
        url: "https://example.com/result",
      }],
    };
  });
  const tool = new AgentWebSearchTool({
    searchWeb,
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {
    includeDomains: ["example.com"],
    query: "companyhelm exa",
    searchType: "fast",
  });

  assert.deepEqual(searchWeb.mock.calls, [[{
    includeDomains: ["example.com"],
    query: "companyhelm exa",
    searchType: "fast",
  }]]);
  assert.deepEqual(result, {
    content: [{
      text: [
        "Search query: companyhelm exa",
        "",
        "1. Search Result Title",
        "URL: https://example.com/result",
        "Published: 2026-04-01T10:00:00.000Z",
        "Excerpt:",
        "Result excerpt",
      ].join("\n"),
      type: "text",
    }],
    details: {
      query: "companyhelm exa",
      requestId: "req-search",
      resultCount: 1,
      searchType: "fast",
    },
  });
});

test("AgentWebFetchTool defaults to markdown and formats each fetched page", async () => {
  const fetchPages = vi.fn(async () => {
    return {
      pages: [{
        publishedDate: null,
        text: "# Page body",
        title: "Fetched Title",
        url: "https://example.com/page",
      }],
      requestId: "req-fetch",
    };
  });
  const tool = new AgentWebFetchTool({
    fetchPages,
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {
    urls: ["https://example.com/page"],
  });

  assert.deepEqual(fetchPages.mock.calls, [[{
    format: "markdown",
    maxAgeHours: undefined,
    maxCharactersPerPage: undefined,
    urls: ["https://example.com/page"],
  }]]);
  assert.deepEqual(result, {
    content: [{
      text: [
        "Page 1",
        "Title: Fetched Title",
        "URL: https://example.com/page",
        "Published: unknown",
        "Format: markdown",
        "Content:",
        "# Page body",
      ].join("\n"),
      type: "text",
    }],
    details: {
      format: "markdown",
      pageCount: 1,
      requestId: "req-fetch",
      urls: ["https://example.com/page"],
    },
  });
});

test("AgentWebToolService passes defaults to Exa search and normalizes search results", async () => {
  const search = vi.fn(async () => {
    return {
      requestId: "req-search-service",
      results: [{
        publishedDate: undefined,
        text: "Normalized excerpt",
        title: null,
        url: "https://example.com/search-result",
      }],
    };
  });
  const service = new AgentWebToolService({
    search,
  } as never);

  const response = await service.searchWeb({
    query: "fresh info",
  });

  assert.deepEqual(search.mock.calls, [[{
    excludeDomains: undefined,
    includeDomains: undefined,
    maxAgeHours: undefined,
    maxCharactersPerResult: 1800,
    numResults: 5,
    query: "fresh info",
    searchType: undefined,
  }]]);
  assert.deepEqual(response, {
    requestId: "req-search-service",
    results: [{
      publishedDate: null,
      text: "Normalized excerpt",
      title: "https://example.com/search-result",
      url: "https://example.com/search-result",
    }],
  });
});

test("AgentWebToolService routes html fetches through Exa html contents", async () => {
  const fetchHtmlContents = vi.fn(async () => {
    return {
      requestId: "req-html",
      results: [{
        publishedDate: "2026-04-01T12:00:00.000Z",
        text: "<main><h1>Title</h1></main>",
        title: "HTML Title",
        url: "https://example.com/html",
      }],
      statuses: [{
        id: "https://example.com/html",
        status: "success",
      }],
    };
  });
  const fetchMarkdownContents = vi.fn(async () => {
    throw new Error("markdown path should not be used");
  });
  const service = new AgentWebToolService({
    fetchHtmlContents,
    fetchMarkdownContents,
  } as never);

  const response = await service.fetchPages({
    format: "html",
    urls: ["https://example.com/html"],
  });

  assert.equal(fetchMarkdownContents.mock.calls.length, 0);
  assert.deepEqual(fetchHtmlContents.mock.calls, [[{
    format: "html",
    maxAgeHours: undefined,
    maxCharactersPerPage: 12000,
    urls: ["https://example.com/html"],
  }]]);
  assert.deepEqual(response, {
    pages: [{
      publishedDate: "2026-04-01T12:00:00.000Z",
      text: "<main><h1>Title</h1></main>",
      title: "HTML Title",
      url: "https://example.com/html",
    }],
    requestId: "req-html",
  });
});

test("AgentWebToolService fails hard when Exa contents reports a page-level crawl error", async () => {
  const service = new AgentWebToolService({
    async fetchMarkdownContents() {
      return {
        requestId: "req-failure",
        results: [],
        statuses: [{
          error: {
            httpStatusCode: 403,
            tag: "SOURCE_NOT_AVAILABLE",
          },
          id: "https://blocked.example.com",
          status: "error",
        }],
      };
    },
  } as never);

  await assert.rejects(
    service.fetchPages({
      format: "markdown",
      urls: ["https://blocked.example.com"],
    }),
    /SOURCE_NOT_AVAILABLE \(403\)/,
  );
});
