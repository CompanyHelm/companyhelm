import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import {
  WorkflowExecutionSessionService,
  type WorkflowExecutionMode,
  type WorkflowExecutionRunStepStatus,
} from "./execution_session_service.ts";
import { SystemCommandJsonSerializer } from "../system_commands/json_serializer.ts";
import { WorkflowService } from "./service.ts";

export type WorkflowExecutionSystemCommandContext = {
  agentId: string;
  companyId: string;
  sessionId: string;
  transactionProvider: TransactionProviderInterface;
};

/**
 * Implements runtime workflow commands exposed by the Execute workflows system skill. It keeps
 * workflow discovery, kickoff, and step-status tracking separate from definition management so
 * agents can run workflows without gaining permission to edit the durable workflow catalog.
 */
export class WorkflowExecutionSystemCommandService {
  private readonly jsonSerializer = new SystemCommandJsonSerializer();
  private readonly workflowService: WorkflowService;

  constructor(workflowService: WorkflowService) {
    this.workflowService = workflowService;
  }

  async execute(
    commandId: string,
    input: unknown,
    context: WorkflowExecutionSystemCommandContext,
  ): Promise<Record<string, unknown>> {
    switch (commandId) {
      case "workflow.execution.list":
        return this.listWorkflows(context);
      case "workflow.execution.current":
        return this.listCurrentWorkflowRun(context);
      case "workflow.execution.start":
        return this.startWorkflow(input, context);
      case "workflow.execution.step.update":
        return this.updateStepStatus(input, context);
      default:
        throw new Error(`System command ${commandId} is not handled by workflow execution.`);
    }
  }

  private async listWorkflows(context: WorkflowExecutionSystemCommandContext): Promise<Record<string, unknown>> {
    return this.jsonSerializer.serializeRecord({
      workflows: await this.createWorkflowSessionService(context).listWorkflows(),
    });
  }

  private async listCurrentWorkflowRun(
    context: WorkflowExecutionSystemCommandContext,
  ): Promise<Record<string, unknown>> {
    return this.jsonSerializer.serializeRecord({
      currentWorkflowRun: await this.createWorkflowSessionService(context).listCurrentWorkflowRun(),
    });
  }

  private async startWorkflow(
    input: unknown,
    context: WorkflowExecutionSystemCommandContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.requireRecord(input);
    return this.jsonSerializer.serializeRecord({
      startedWorkflow: await this.createWorkflowSessionService(context).startWorkflow({
        agentId: this.readOptionalString(payload, "agentId"),
        executionMode: this.readExecutionMode(payload),
        input: this.readOptionalRecord(payload, "input") ?? {},
        workflowDefinitionId: this.readRequiredString(payload, "workflowDefinitionId"),
      }),
    });
  }

  private async updateStepStatus(
    input: unknown,
    context: WorkflowExecutionSystemCommandContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.requireRecord(input);
    return this.jsonSerializer.serializeRecord({
      workflowRun: await this.createWorkflowSessionService(context).updateStepStatus({
        status: this.readStepStatus(payload),
        workflowRunStepId: this.readRequiredString(payload, "workflowRunStepId"),
      }),
    });
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

  private readOptionalRecord(payload: Record<string, unknown>, key: string): Record<string, unknown> | null {
    const value = payload[key];
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${key} must be a JSON object.`);
    }

    return value as Record<string, unknown>;
  }

  private readExecutionMode(payload: Record<string, unknown>): WorkflowExecutionMode | undefined {
    const value = this.readOptionalString(payload, "executionMode");
    if (value === undefined) {
      return undefined;
    }
    if (value !== "local" && value !== "agent") {
      throw new Error("executionMode must be local or agent.");
    }

    return value;
  }

  private readStepStatus(payload: Record<string, unknown>): WorkflowExecutionRunStepStatus {
    const value = this.readRequiredString(payload, "status");
    if (value !== "pending" && value !== "running" && value !== "done") {
      throw new Error("status must be pending, running, or done.");
    }

    return value;
  }

  private createWorkflowSessionService(context: WorkflowExecutionSystemCommandContext): WorkflowExecutionSessionService {
    return new WorkflowExecutionSessionService(
      context.transactionProvider,
      context.companyId,
      context.agentId,
      context.sessionId,
      this.workflowService,
    );
  }
}
