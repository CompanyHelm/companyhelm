import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentLeaseService } from "../lease_service.ts";
import {
  type AgentComputeProviderInterface,
  type AgentEnvironmentRecord,
} from "../providers/provider_interface.ts";
import { AgentComputeProviderRegistry } from "../providers/provider_registry.ts";
import { AgentEnvironmentCatalogService } from "../catalog_service.ts";
import { AgentEnvironmentShellInterface } from "../providers/shell_interface.ts";
import { AgentEnvironmentSkillMaterializationService } from "./materialization_service.ts";
import { SessionSkillService } from "../../skills/session_service.ts";
import type { SkillRecord } from "../../skills/service.ts";

/**
 * Synchronizes the persisted session-active skill set into concrete environment files. It keeps
 * lease lookup, provider-shell creation, and per-skill materialization in one place so both
 * environment acquisition and live activation reuse the same sync pipeline.
 */
@injectable()
export class AgentEnvironmentSkillSyncService {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly leaseService: AgentEnvironmentLeaseService;
  private readonly materializationService: AgentEnvironmentSkillMaterializationService;
  private readonly providerRegistry: AgentComputeProviderRegistry;
  private readonly sessionSkillService: SessionSkillService;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(AgentEnvironmentLeaseService) leaseService: AgentEnvironmentLeaseService,
    @inject(AgentComputeProviderRegistry)
    providerRegistryOrProvider: AgentComputeProviderRegistry | AgentComputeProviderInterface,
    @inject(SessionSkillService)
    sessionSkillService: SessionSkillService = new SessionSkillService(),
    @inject(AgentEnvironmentSkillMaterializationService)
    materializationService: AgentEnvironmentSkillMaterializationService = new AgentEnvironmentSkillMaterializationService(),
  ) {
    this.catalogService = catalogService;
    this.leaseService = leaseService;
    this.materializationService = materializationService;
    this.providerRegistry = AgentEnvironmentSkillSyncService.isProvider(providerRegistryOrProvider)
      ? {
          get() {
            return providerRegistryOrProvider;
          },
        } as never
      : providerRegistryOrProvider;
    this.sessionSkillService = sessionSkillService;
  }

  async syncActiveSkillsForEnvironment(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    environment: AgentEnvironmentRecord,
    environmentShell?: AgentEnvironmentShellInterface,
  ): Promise<void> {
    const activeSkills = await this.sessionSkillService.listActiveSkills(
      transactionProvider,
      environment.companyId,
      sessionId,
    );
    if (activeSkills.length === 0) {
      return;
    }

    const resolvedEnvironmentShell = environmentShell ?? await this.providerRegistry
      .get(environment.provider)
      .createShell(transactionProvider, environment);

    for (const skill of activeSkills) {
      await this.materializationService.materializeSkill(resolvedEnvironmentShell, skill);
    }
  }

  async syncSkillIntoOpenEnvironmentForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
    skill: SkillRecord,
  ): Promise<boolean> {
    await this.leaseService.expireElapsedLeases(transactionProvider);
    const openLease = await this.leaseService.findOpenLeaseForSession(transactionProvider, agentId, sessionId);
    if (!openLease) {
      return false;
    }

    const environment = await this.catalogService.loadEnvironmentById(transactionProvider, openLease.environmentId);
    if (!environment) {
      throw new Error("Leased environment not found.");
    }

    const environmentShell = await this.providerRegistry
      .get(environment.provider)
      .createShell(transactionProvider, environment);
    await this.materializationService.materializeSkill(environmentShell, skill);
    return skill.fileList.length > 0;
  }

  async removeSkillFromOpenEnvironmentForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
    skill: SkillRecord,
  ): Promise<boolean> {
    await this.leaseService.expireElapsedLeases(transactionProvider);
    const openLease = await this.leaseService.findOpenLeaseForSession(transactionProvider, agentId, sessionId);
    if (!openLease) {
      return false;
    }

    const environment = await this.catalogService.loadEnvironmentById(transactionProvider, openLease.environmentId);
    if (!environment) {
      throw new Error("Leased environment not found.");
    }

    const environmentShell = await this.providerRegistry
      .get(environment.provider)
      .createShell(transactionProvider, environment);
    await this.materializationService.dematerializeSkill(environmentShell, skill);
    return skill.fileList.length > 0;
  }

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
