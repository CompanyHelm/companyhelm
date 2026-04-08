import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentShellInterface } from "./shell_interface.ts";

export type ComputeProvider = "daytona" | "e2b";
export type AgentEnvironmentStatus = "available" | "deleting" | "provisioning" | "running" | "stopped" | "unhealthy";

/**
 * Describes one provider-backed environment template that an agent can select for future
 * provisioning. Templates replace free-form CPU and memory selection with a named catalog entry
 * that already declares the compute envelope and any special capabilities such as computer use.
 */
export type AgentEnvironmentTemplate = {
  computerUse: boolean;
  cpuCount: number;
  diskSpaceGb: number;
  memoryGb: number;
  name: string;
  templateId: string;
};

export type AgentEnvironmentProvisionRequest = {
  agentId: string;
  companyId: string;
  providerDefinitionId: string;
  sessionId: string;
  template: AgentEnvironmentTemplate;
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
  provider: ComputeProvider;
  providerDefinitionId: string | null;
  providerEnvironmentId: string;
  templateId: string;
  updatedAt: Date;
};

/**
 * Bridges the generic environment orchestration layer onto one concrete compute provider. The
 * access service uses this contract to provision new environments on demand and to create shell
 * adapters for already selected environment rows.
 */
export abstract class AgentComputeProviderInterface {
  /**
   * Returns the stable provider identifier so selection and persistence can associate rows with the
   * implementation that knows how to operate them.
   */
  abstract getProvider(): ComputeProvider;

  /**
   * Reports whether the provider can create environments on demand when the lease layer cannot
   * reuse an existing environment for the agent.
   */
  abstract supportsOnDemandProvisioning(): boolean;

  /**
   * Lists the provider-backed templates that CompanyHelm allows for a specific compute provider
   * definition. Callers use this to present valid options and to validate persisted agent choices.
   */
  abstract getTemplates(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      providerDefinitionId: string;
    },
  ): Promise<AgentEnvironmentTemplate[]>;

  /**
   * Creates a brand new environment for the agent session when no reusable environment exists.
   */
  abstract provisionEnvironment(
    transactionProvider: TransactionProviderInterface,
    request: AgentEnvironmentProvisionRequest,
  ): Promise<AgentEnvironmentProvisionResult>;

  /**
   * Fetches the latest provider-side environment status instead of trusting persisted state. This
   * keeps the catalog focused on identity and resource metadata while GraphQL can still expose the
   * live environment health from the provider.
   */
  abstract getEnvironmentStatus(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<AgentEnvironmentStatus>;

  /**
   * Deletes the provider-side environment for a persisted catalog row. Mutations use this before
   * removing the local catalog record so provider compute is not orphaned.
   */
  abstract deleteEnvironment(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void>;

  /**
   * Starts a provider-side environment so interactive shells and previews can be used without the
   * caller needing to know provider-specific lifecycle APIs.
   */
  abstract startEnvironment(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void>;

  /**
   * Stops a provider-side environment to release active compute while keeping the catalog row
   * available for later reuse.
   */
  abstract stopEnvironment(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void>;

  /**
   * Starts or reuses the provider-specific desktop stream for an environment and returns the URL
   * that a browser can open directly.
   */
  abstract getVncUrl(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<string>;

  /**
   * Creates the provider-specific shell adapter for an already selected environment row. Shared
   * PTY/session orchestration can then layer tmux or some other terminal manager on top.
   */
  abstract createShell(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<AgentEnvironmentShellInterface>;
}
