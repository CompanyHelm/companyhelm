import type { ExaWebFetchFormat } from "../../../../../../services/web_search/exa_client.ts";
import type { AgentWebFetchPage, AgentWebSearchResult } from "./service.ts";

/**
 * Formats Exa web results into deterministic plain-text blocks that remain easy for the model to
 * parse while preserving markdown bodies returned by Exa.
 */
export class AgentWebResultFormatter {
  static formatFetchPages(pages: AgentWebFetchPage[], format: ExaWebFetchFormat): string {
    if (pages.length === 0) {
      return "No pages were returned.";
    }

    return pages.map((page, index) => {
      return [
        `Page ${index + 1}`,
        `Title: ${page.title}`,
        `URL: ${page.url}`,
        `Published: ${page.publishedDate ?? "unknown"}`,
        `Format: ${format}`,
        "Content:",
        page.text ?? "",
      ].join("\n");
    }).join("\n\n---\n\n");
  }

  static formatSearchResults(query: string, results: AgentWebSearchResult[]): string {
    if (results.length === 0) {
      return `No search results found for: ${query}`;
    }

    return [
      `Search query: ${query}`,
      "",
      ...results.flatMap((result, index) => {
        return [
          `${index + 1}. ${result.title}`,
          `URL: ${result.url}`,
          `Published: ${result.publishedDate ?? "unknown"}`,
          "Excerpt:",
          result.text ?? "",
          "",
        ];
      }),
    ].join("\n").trimEnd();
  }
}
