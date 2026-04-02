import type { SearchResponse } from "exa-js";
import { ExaWebClient, type ExaWebFetchFormat } from "../../../../services/web_search/exa_client.ts";

export type AgentWebSearchResult = {
  publishedDate: string | null;
  text: string | null;
  title: string;
  url: string;
};

export type AgentWebSearchResponse = {
  requestId: string;
  results: AgentWebSearchResult[];
};

export type AgentWebFetchPage = {
  publishedDate: string | null;
  text: string | null;
  title: string;
  url: string;
};

export type AgentWebFetchResponse = {
  pages: AgentWebFetchPage[];
  requestId: string;
};

type ExaStatusRecord = {
  error?: {
    httpStatusCode?: number;
    tag?: string;
  };
  id: string;
  source?: string;
  status: string;
};

type SearchResponseWithStatuses<T> = SearchResponse<T> & {
  statuses?: ExaStatusRecord[];
};

/**
 * Normalizes Exa search and contents responses into agent-safe records and enforces the fail-hard
 * policy requested for web retrieval errors.
 */
export class AgentWebToolService {
  private readonly exaWebClient: ExaWebClient;

  constructor(exaWebClient: ExaWebClient) {
    this.exaWebClient = exaWebClient;
  }

  async fetchPages(input: {
    format: ExaWebFetchFormat;
    maxAgeHours?: number;
    maxCharactersPerPage?: number;
    urls: string[];
  }): Promise<AgentWebFetchResponse> {
    const response = input.format === "html"
      ? await this.exaWebClient.fetchHtmlContents({
        format: input.format,
        maxAgeHours: input.maxAgeHours,
        maxCharactersPerPage: input.maxCharactersPerPage ?? 12000,
        urls: input.urls,
      })
      : await this.exaWebClient.fetchMarkdownContents({
        format: input.format,
        maxAgeHours: input.maxAgeHours,
        maxCharactersPerPage: input.maxCharactersPerPage ?? 12000,
        urls: input.urls,
      });

    AgentWebToolService.assertSuccessfulStatuses(response as SearchResponseWithStatuses<{
      text: {
        maxCharacters: number;
      };
    }>);

    return {
      pages: response.results.map((result) => ({
        publishedDate: result.publishedDate ?? null,
        text: result.text ?? null,
        title: result.title ?? result.url,
        url: result.url,
      })),
      requestId: response.requestId,
    };
  }

  async searchWeb(input: {
    excludeDomains?: string[];
    includeDomains?: string[];
    maxAgeHours?: number;
    maxCharactersPerResult?: number;
    numResults?: number;
    query: string;
    searchType?: "auto" | "deep" | "deep-reasoning" | "fast" | "hybrid" | "instant" | "keyword" | "neural";
  }): Promise<AgentWebSearchResponse> {
    const response = await this.exaWebClient.search({
      excludeDomains: input.excludeDomains,
      includeDomains: input.includeDomains,
      maxAgeHours: input.maxAgeHours,
      maxCharactersPerResult: input.maxCharactersPerResult ?? 1800,
      numResults: input.numResults ?? 5,
      query: input.query,
      searchType: input.searchType,
    });

    return {
      requestId: response.requestId,
      results: response.results.map((result) => ({
        publishedDate: result.publishedDate ?? null,
        text: result.text ?? null,
        title: result.title ?? result.url,
        url: result.url,
      })),
    };
  }

  private static assertSuccessfulStatuses(
    response: SearchResponseWithStatuses<{
      text: {
        maxCharacters: number;
      };
    }>,
  ): void {
    const failedStatuses = (response.statuses ?? []).filter((status) => status.status !== "success");
    if (failedStatuses.length === 0) {
      return;
    }

    throw new Error([
      "Exa failed to load one or more pages:",
      ...failedStatuses.map((status) => {
        if (!status.error) {
          return `- ${status.id}: ${status.status}`;
        }

        const tag = status.error.tag ?? status.status;
        const httpStatusCode = status.error.httpStatusCode ? ` (${status.error.httpStatusCode})` : "";
        return `- ${status.id}: ${tag}${httpStatusCode}`;
      }),
    ].join("\n"));
  }
}
