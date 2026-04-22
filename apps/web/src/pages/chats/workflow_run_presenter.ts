import type { SessionRecord } from "./chats_page_data";

type AssociatedWorkflowRunRecord = NonNullable<SessionRecord["associatedWorkflowRun"]>;
type AssociatedWorkflowRunStepRecord = AssociatedWorkflowRunRecord["steps"][number];
type BadgeVariant = "destructive" | "outline" | "positive" | "warning";

/**
 * Centralizes the compact workflow run copy used by the chat list and transcript strip. The UI
 * needs to show current-step progress in very little space, so running steps count as reached while
 * pending steps remain outside the numerator.
 */
export class WorkflowRunPresenter {
  static formatProgress(workflowRun: AssociatedWorkflowRunRecord): string {
    return `${this.getProgressStepCount(workflowRun)}/${workflowRun.steps.length}`;
  }

  static formatStatus(status: string): string {
    return status;
  }

  static getBadgeTitle(workflowRun: AssociatedWorkflowRunRecord): string {
    return `${workflowRun.name}: ${this.formatStatus(workflowRun.status)}, ${this.formatProgress(workflowRun)} workflow steps`;
  }

  static getProgressStepCount(workflowRun: AssociatedWorkflowRunRecord): number {
    if (workflowRun.status === "done") {
      return workflowRun.steps.length;
    }

    const reachedStepCount = workflowRun.steps.filter((step) => {
      return step.status === "done" || step.status === "running";
    }).length;
    return Math.min(reachedStepCount, workflowRun.steps.length);
  }

  static getVisibleSteps(workflowRun: AssociatedWorkflowRunRecord): AssociatedWorkflowRunStepRecord[] {
    return [...workflowRun.steps].sort((leftStep, rightStep) => {
      const ordinalDelta = leftStep.ordinal - rightStep.ordinal;
      if (ordinalDelta !== 0) {
        return ordinalDelta;
      }

      return leftStep.id.localeCompare(rightStep.id);
    }).slice(0, 5);
  }

  static isRunning(workflowRun: AssociatedWorkflowRunRecord): boolean {
    return workflowRun.status === "running";
  }

  static resolveRunBadgeVariant(status: string): BadgeVariant {
    if (status === "done") {
      return "positive";
    }
    if (status === "running") {
      return "warning";
    }
    if (status === "canceled") {
      return "destructive";
    }

    return "outline";
  }
}
