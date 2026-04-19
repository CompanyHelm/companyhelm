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
  runningStepRunId: string;
  steps: WorkflowRunTemplateStepInput[];
  workflowDefinitionId: string;
  workflowDescription: string | null;
  workflowName: string;
  workflowRunId: string;
};

/**
 * Renders the first queued message for an agent-backed workflow run. The prompt uses runtime step
 * ids from `workflow_run_steps` so later execution tooling can advance the exact run snapshot
 * without relying on mutable definition-step ids.
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
