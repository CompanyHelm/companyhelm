import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type {
  WorkflowInputDraft,
  WorkflowRecord,
  WorkflowStepDraft,
} from "./types.ts";
import { WorkflowService } from "./service.ts";
import { SystemCommandJsonSerializer } from "../system_commands/json_serializer.ts";

export type WorkflowSystemCommandContext = {
  agentId: string;
  companyId: string;
  sessionId: string;
  transactionProvider: TransactionProviderInterface;
};

/**
 * Implements workflow-definition commands exposed by the Workflow management system skill. The
 * class intentionally edits through WorkflowService so commands preserve the same validation and
 * hydration behavior as the GraphQL workflow management surface.
 */
export class WorkflowSystemCommandService {
  private readonly jsonSerializer = new SystemCommandJsonSerializer();
  private readonly workflowService: WorkflowService;

  constructor(workflowService: WorkflowService) {
    this.workflowService = workflowService;
  }

  async execute(
    commandId: string,
    input: unknown,
    context: WorkflowSystemCommandContext,
  ): Promise<Record<string, unknown>> {
    switch (commandId) {
      case "workflow.list":
        return this.listWorkflows(context);
      case "workflow.create":
        return this.serializeWorkflow(await this.createWorkflow(input, context));
      case "workflow.update":
        return this.serializeWorkflow(await this.updateWorkflow(input, context));
      case "workflow.steps.add":
        return this.serializeWorkflow(await this.addStep(input, context));
      case "workflow.steps.update":
        return this.serializeWorkflow(await this.updateStep(input, context));
      case "workflow.steps.delete":
        return this.serializeWorkflow(await this.deleteStep(input, context));
      case "workflow.inputs.add":
        return this.serializeWorkflow(await this.addInput(input, context));
      case "workflow.inputs.delete":
        return this.serializeWorkflow(await this.deleteInput(input, context));
      default:
        throw new Error(`System command ${commandId} is not handled by workflow management.`);
    }
  }

  private async listWorkflows(context: WorkflowSystemCommandContext): Promise<Record<string, unknown>> {
    return this.jsonSerializer.serializeRecord({
      workflows: await this.workflowService.listWorkflows(context.transactionProvider, context.companyId),
    });
  }

  private async createWorkflow(input: unknown, context: WorkflowSystemCommandContext): Promise<WorkflowRecord> {
    const payload = this.requireRecord(input);
    return this.workflowService.createWorkflow(context.transactionProvider, {
      companyId: context.companyId,
      description: this.readOptionalNullableString(payload, "description"),
      inputs: this.readInputDrafts(payload.inputs ?? []),
      instructions: this.readOptionalNullableString(payload, "instructions"),
      isEnabled: this.readOptionalBoolean(payload, "isEnabled"),
      name: this.readRequiredString(payload, "name"),
      steps: this.readStepDrafts(payload.steps),
    });
  }

  private async updateWorkflow(input: unknown, context: WorkflowSystemCommandContext): Promise<WorkflowRecord> {
    const payload = this.requireRecord(input);
    return this.workflowService.updateWorkflow(context.transactionProvider, {
      companyId: context.companyId,
      description: this.readOptionalNullableString(payload, "description"),
      instructions: this.readOptionalNullableString(payload, "instructions"),
      isEnabled: this.readOptionalBoolean(payload, "isEnabled"),
      name: this.readOptionalString(payload, "name"),
      workflowDefinitionId: this.readRequiredString(payload, "workflowDefinitionId"),
    });
  }

  private async addStep(input: unknown, context: WorkflowSystemCommandContext): Promise<WorkflowRecord> {
    const payload = this.requireRecord(input);
    const workflowDefinitionId = this.readRequiredString(payload, "workflowDefinitionId");
    const workflow = await this.workflowService.getWorkflow(
      context.transactionProvider,
      context.companyId,
      workflowDefinitionId,
    );
    const nextStep = {
      instructions: this.readOptionalNullableString(payload, "instructions") ?? null,
      name: this.readRequiredString(payload, "name"),
    };
    const nextSteps = workflow.steps.map((step) => ({
      instructions: step.instructions,
      name: step.name,
    }));
    const position = this.readOptionalInteger(payload, "position");
    const insertIndex = position === null
      ? nextSteps.length
      : Math.max(0, Math.min(position, nextSteps.length));
    nextSteps.splice(insertIndex, 0, nextStep);

    return this.workflowService.updateWorkflow(context.transactionProvider, {
      companyId: context.companyId,
      steps: nextSteps,
      workflowDefinitionId,
    });
  }

  private async updateStep(input: unknown, context: WorkflowSystemCommandContext): Promise<WorkflowRecord> {
    const payload = this.requireRecord(input);
    return this.workflowService.updateWorkflowStep(
      context.transactionProvider,
      {
        companyId: context.companyId,
        instructions: this.readOptionalNullableString(payload, "instructions"),
        name: this.readOptionalString(payload, "name"),
        stepId: this.readRequiredString(payload, "stepId"),
        workflowDefinitionId: this.readRequiredString(payload, "workflowDefinitionId"),
      },
    );
  }

  private async deleteStep(input: unknown, context: WorkflowSystemCommandContext): Promise<WorkflowRecord> {
    const payload = this.requireRecord(input);
    return this.workflowService.deleteWorkflowStep(
      context.transactionProvider,
      {
        companyId: context.companyId,
        stepId: this.readRequiredString(payload, "stepId"),
        workflowDefinitionId: this.readRequiredString(payload, "workflowDefinitionId"),
      },
    );
  }

  private async addInput(input: unknown, context: WorkflowSystemCommandContext): Promise<WorkflowRecord> {
    const payload = this.requireRecord(input);
    const workflowDefinitionId = this.readRequiredString(payload, "workflowDefinitionId");
    const workflow = await this.workflowService.getWorkflow(
      context.transactionProvider,
      context.companyId,
      workflowDefinitionId,
    );
    const nextInputs = workflow.inputs.map((workflowInput) => ({
      defaultValue: workflowInput.defaultValue,
      description: workflowInput.description,
      isRequired: workflowInput.isRequired,
      name: workflowInput.name,
    }));
    nextInputs.push({
      defaultValue: this.readOptionalNullableString(payload, "defaultValue") ?? null,
      description: this.readOptionalNullableString(payload, "description") ?? null,
      isRequired: this.readOptionalBoolean(payload, "isRequired") ?? false,
      name: this.readRequiredString(payload, "name"),
    });

    return this.workflowService.updateWorkflow(context.transactionProvider, {
      companyId: context.companyId,
      inputs: nextInputs,
      workflowDefinitionId,
    });
  }

  private async deleteInput(input: unknown, context: WorkflowSystemCommandContext): Promise<WorkflowRecord> {
    const payload = this.requireRecord(input);
    const workflowDefinitionId = this.readRequiredString(payload, "workflowDefinitionId");
    const inputId = this.readRequiredString(payload, "inputId");
    const workflow = await this.workflowService.getWorkflow(
      context.transactionProvider,
      context.companyId,
      workflowDefinitionId,
    );
    const nextInputs = workflow.inputs
      .filter((workflowInput) => workflowInput.id !== inputId)
      .map((workflowInput) => ({
        defaultValue: workflowInput.defaultValue,
        description: workflowInput.description,
        isRequired: workflowInput.isRequired,
        name: workflowInput.name,
      }));
    if (nextInputs.length === workflow.inputs.length) {
      throw new Error(`Workflow input ${inputId} not found.`);
    }

    return this.workflowService.updateWorkflow(context.transactionProvider, {
      companyId: context.companyId,
      inputs: nextInputs,
      workflowDefinitionId,
    });
  }

  private readInputDrafts(value: unknown): WorkflowInputDraft[] {
    if (!Array.isArray(value)) {
      throw new Error("inputs must be an array.");
    }

    return value.map((entry) => {
      const payload = this.requireRecord(entry);
      return {
        defaultValue: this.readOptionalNullableString(payload, "defaultValue"),
        description: this.readOptionalNullableString(payload, "description"),
        isRequired: this.readOptionalBoolean(payload, "isRequired") ?? false,
        name: this.readRequiredString(payload, "name"),
      };
    });
  }

  private readStepDrafts(value: unknown): WorkflowStepDraft[] {
    if (!Array.isArray(value)) {
      throw new Error("steps must be an array.");
    }

    return value.map((entry) => {
      const payload = this.requireRecord(entry);
      return {
        instructions: this.readOptionalNullableString(payload, "instructions"),
        name: this.readRequiredString(payload, "name"),
      };
    });
  }

  private serializeWorkflow(workflow: WorkflowRecord): Record<string, unknown> {
    return {
      createdAt: workflow.createdAt.toISOString(),
      description: workflow.description,
      id: workflow.id,
      inputs: workflow.inputs.map((input) => ({
        defaultValue: input.defaultValue,
        description: input.description,
        id: input.id,
        isRequired: input.isRequired,
        name: input.name,
      })),
      instructions: workflow.instructions,
      isEnabled: workflow.isEnabled,
      name: workflow.name,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        instructions: step.instructions,
        name: step.name,
        ordinal: step.ordinal,
        stepId: step.stepId,
      })),
      updatedAt: workflow.updatedAt.toISOString(),
    };
  }

  private requireRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("System command input must be a JSON object.");
    }

    return value as Record<string, unknown>;
  }

  private readRequiredString(payload: Record<string, unknown>, key: string): string {
    const value = this.readOptionalString(payload, key);
    if (!value) {
      throw new Error(`${key} is required.`);
    }

    return value;
  }

  private readOptionalString(payload: Record<string, unknown>, key: string): string | undefined {
    const value = payload[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "string") {
      throw new Error(`${key} must be a string.`);
    }

    return value;
  }

  private readOptionalNullableString(payload: Record<string, unknown>, key: string): string | null | undefined {
    const value = payload[key];
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value !== "string") {
      throw new Error(`${key} must be a string or null.`);
    }

    return value;
  }

  private readOptionalBoolean(payload: Record<string, unknown>, key: string): boolean | null {
    const value = payload[key];
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== "boolean") {
      throw new Error(`${key} must be a boolean.`);
    }

    return value;
  }

  private readOptionalInteger(payload: Record<string, unknown>, key: string): number | null {
    const value = payload[key];
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error(`${key} must be an integer.`);
    }

    return value;
  }
}
