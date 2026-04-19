import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";

type WorkflowRunTemplateStepInput = {
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
};

type WorkflowRunTemplateInput = {
  instructions: string | null;
  steps: WorkflowRunTemplateStepInput[];
  workflowDescription: string | null;
  workflowName: string;
};

/**
 * Renders the first queued message for an agent-backed workflow run. It includes runtime step ids
 * from `workflow_run_steps` without exposing definition or run ids that the backend already knows.
 */
export class WorkflowRunTemplate {
  private readonly templateSource = readFileSync(
    new URL("../templates/workflow_run.njk", import.meta.url),
    "utf8",
  ).trim();

  render(input: WorkflowRunTemplateInput): string {
    return nunjucks.renderString(this.templateSource, input).trim();
  }
}
