import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";
/**
 * Loads and renders one module-owned append-system-prompt template from the shared template tree.
 * The module name stays the lookup key so prompt text lives beside other templates instead of
 * being embedded inline in the module classes themselves.
 */
export class AgentSessionModulePromptTemplate {
  private readonly templateSource: string;

  constructor(moduleName: string) {
    this.templateSource = readFileSync(
      new URL(`../../../../../templates/modules/${moduleName}.njk`, import.meta.url),
      "utf8",
    ).trim();
  }

  render(context: object): string {
    return nunjucks.renderString(this.templateSource, context).trim();
  }
}
