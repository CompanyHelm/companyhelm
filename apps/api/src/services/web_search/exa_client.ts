import { inject, injectable } from "inversify";
import { Exa, type RegularSearchOptions, type SearchResponse } from "exa-js";
import { Config } from "../../config/schema.ts";

export type ExaWebSearchRequest = {
  excludeDomains?: string[];
  includeDomains?: string[];
  maxAgeHours?: number;
  maxCharactersPerResult: number;
  numResults?: number;
  query: string;
  searchType?: RegularSearchOptions["type"];
};

export type ExaWebFetchFormat = "html" | "markdown";

export type ExaWebFetchRequest = {
  format: ExaWebFetchFormat;
  maxAgeHours?: number;
  maxCharactersPerPage: number;
  urls: string[];
};

export type ExaTextSearchResponse = SearchResponse<{
  text: {
    maxCharacters: number;
  };
}>;

export type ExaHtmlSearchResponse = SearchResponse<{
  text: {
    includeHtmlTags: true;
    maxCharacters: number;
  };
}>;

/**
 * Wraps the official Exa SDK behind a small CompanyHelm-specific surface so agent tools can stay
 * focused on prompt-friendly parameters and formatting instead of low-level API options.
 */
@injectable()
export class ExaWebClient {
  private readonly client: Exa;

  constructor(@inject(Config) config: Config) {
    this.client = new Exa(config.web_search.exa.api_key);
  }

  async fetchMarkdownContents(request: ExaWebFetchRequest): Promise<ExaTextSearchResponse> {
    return this.client.getContents(request.urls, {
      maxAgeHours: request.maxAgeHours,
      text: {
        maxCharacters: request.maxCharactersPerPage,
      },
    });
  }

  async fetchHtmlContents(request: ExaWebFetchRequest): Promise<ExaHtmlSearchResponse> {
    return this.client.getContents(request.urls, {
      maxAgeHours: request.maxAgeHours,
      text: {
        includeHtmlTags: true,
        maxCharacters: request.maxCharactersPerPage,
      },
    });
  }

  async search(request: ExaWebSearchRequest): Promise<ExaTextSearchResponse> {
    return this.client.search(request.query, {
      contents: {
        maxAgeHours: request.maxAgeHours,
        text: {
          maxCharacters: request.maxCharactersPerResult,
        },
      },
      excludeDomains: request.excludeDomains,
      includeDomains: request.includeDomains,
      numResults: request.numResults,
      type: request.searchType,
    });
  }
}
