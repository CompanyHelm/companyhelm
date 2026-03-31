import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";
import { SystemPromptTemplateContext } from "./system_prompt_template_context.ts";

/**
 * Loads and renders the PI Mono system prompt template from the API source tree so the prompt text
 * lives in a dedicated artifact instead of being embedded inline in service code.
 */
export class SystemPromptTemplate {
  private readonly templateSource = readFileSync(
    new URL("./system_prompt.njk", import.meta.url),
    "utf8",
  ).trim();

  render(context: SystemPromptTemplateContext): string {
    return nunjucks.renderString(this.templateSource, context).trim();
  }
}
