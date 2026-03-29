import { readFileSync } from "node:fs";
import * as nunjucks from "nunjucks";

/**
 * Loads and renders the PI Mono system prompt template from the API source tree so the prompt text
 * lives in a dedicated artifact instead of being embedded inline in service code.
 */
export class SystemPromptTemplate {
  private readonly templateSource = readFileSync(
    new URL("./system_prompt.njk", import.meta.url),
    "utf8",
  ).trim();

  render(context: Record<string, string> = {}): string {
    return nunjucks.renderString(this.templateSource, context).trim();
  }
}
