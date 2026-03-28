import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentRuntimeInterface } from "./runtime_interface.ts";

export type AgentEnvironmentProvisionRequest = {
  agentId: string;
  companyId: string;
  sessionId: string;
};

export type AgentEnvironmentProvisionResult = {
  cleanup?: () => Promise<void>;
  cpuCount: number;
  diskSpaceGb: number;
  displayName?: string | null;
  memoryGb: number;
  metadata: Record<string, unknown>;
  platform: "linux" | "macos" | "windows";
  providerEnvironmentId: string;
  status: "available" | "provisioning" | "running" | "stopped" | "unhealthy";
};

export type AgentEnvironmentRecord = {
  agentId: string;
  companyId: string;
  cpuCount: number;
  createdAt: Date;
  diskSpaceGb: number;
  displayName: string | null;
  id: string;
  lastSeenAt: Date | null;
  memoryGb: number;
  metadata: Record<string, unknown>;
  platform: "linux" | "macos" | "windows";
  provider: "daytona";
  providerEnvironmentId: string;
  status: "available" | "deleting" | "provisioning" | "running" | "stopped" | "unhealthy";
  updatedAt: Date;
};

/**
 * Bridges the generic environment orchestration layer onto one concrete compute provider. The
 * access service uses this contract to provision new environments on demand and to create runtime
 * handles for already selected environment rows.
 */
export abstract class AgentComputeProviderInterface {
  /**
   * Returns the stable provider identifier so selection and persistence can associate rows with the
   * implementation that knows how to operate them.
   */
  abstract getProvider(): "daytona";

  /**
   * Reports whether the provider can create environments on demand when the lease layer cannot
   * reuse an existing environment for the agent.
   */
  abstract supportsOnDemandProvisioning(): boolean;

  /**
   * Creates a brand new environment for the agent session when no reusable environment exists.
   */
  abstract provisionEnvironment(
    transactionProvider: TransactionProviderInterface,
    request: AgentEnvironmentProvisionRequest,
  ): Promise<AgentEnvironmentProvisionResult>;

  /**
   * Creates a provider runtime handle for an already selected environment row.
   */
  abstract createRuntime(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<AgentEnvironmentRuntimeInterface>;
}
