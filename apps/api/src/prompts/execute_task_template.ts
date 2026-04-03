import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";

type ExecuteTaskTemplateInput = {
  description: string | null;
  id: string;
  name: string;
  taskCategoryName: string | null;
};

/**
 * Renders the first message queued into an execution session for a task. Keeping this prompt in a
 * dedicated template makes it easy to evolve the execution instructions without mixing prompt copy
 * into the task-run orchestration code.
 */
export class ExecuteTaskTemplate {
  private readonly templateSource = readFileSync(
    new URL("../templates/execute_task.njk", import.meta.url),
    "utf8",
  ).trim();

  render(input: ExecuteTaskTemplateInput): string {
    return nunjucks.renderString(this.templateSource, input).trim();
  }
}
