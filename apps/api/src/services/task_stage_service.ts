import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import type { AppRuntimeTransaction } from "../db/transaction_provider_interface.ts";
import { taskStages } from "../db/schema.ts";

export type TaskStageServiceStage = {
  id: string;
  isDefault: boolean;
  name: string;
};

/**
 * Owns the company task-stage invariant: every company has one protected Backlog stage and every
 * task references a persisted stage instead of using null as a second representation.
 */
@injectable()
export class TaskStageService {
  static readonly DEFAULT_TASK_STAGE_NAME = "Backlog";

  async requireDefaultTaskStage(
    tx: AppRuntimeTransaction,
    companyId: string,
  ): Promise<TaskStageServiceStage> {
    const [taskStageRecord] = await tx
      .select({
        id: taskStages.id,
        isDefault: taskStages.isDefault,
        name: taskStages.name,
      })
      .from(taskStages)
      .where(and(
        eq(taskStages.companyId, companyId),
        eq(taskStages.isDefault, true),
      )) as TaskStageServiceStage[];
    if (!taskStageRecord) {
      throw new Error("Default task stage not found.");
    }

    return taskStageRecord;
  }

  async resolveTaskStageRecord(
    tx: AppRuntimeTransaction,
    companyId: string,
    taskStageId: string | null | undefined,
  ): Promise<TaskStageServiceStage> {
    if (!taskStageId) {
      return this.requireDefaultTaskStage(tx, companyId);
    }

    const [taskStageRecord] = await tx
      .select({
        id: taskStages.id,
        isDefault: taskStages.isDefault,
        name: taskStages.name,
      })
      .from(taskStages)
      .where(and(
        eq(taskStages.companyId, companyId),
        eq(taskStages.id, taskStageId),
      )) as TaskStageServiceStage[];
    if (!taskStageRecord) {
      throw new Error("Task stage not found.");
    }

    return taskStageRecord;
  }
}
