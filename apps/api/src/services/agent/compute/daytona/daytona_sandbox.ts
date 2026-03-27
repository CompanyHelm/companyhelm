import type { AgentSandboxRecord } from "../../sandbox_service.ts";
import { AgentComputeSandboxInterface } from "../sandbox_interface.ts";

/**
 * Adapts the persisted Daytona sandbox row into the generic compute sandbox contract used by the
 * rest of the agent layer.
 */
export class AgentComputeDaytonaSandbox extends AgentComputeSandboxInterface {
  private readonly sandboxRecord: AgentSandboxRecord;

  constructor(sandboxRecord: AgentSandboxRecord) {
    super();
    this.sandboxRecord = sandboxRecord;
  }

  getId(): string {
    return this.sandboxRecord.id;
  }

  getRuntimeId(): string {
    return this.sandboxRecord.daytonaSandboxId;
  }

  getStatus(): string {
    return this.sandboxRecord.status;
  }
}
