import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { DatabaseTransactionInterface } from "../../db/database_interface.ts";
import {
  companies,
  companyMembers,
  computeProviderDefinitions,
  taskStages,
} from "../../db/schema.ts";
import type { ComputeProvider } from "../environments/providers/provider_interface.ts";
import { CompanyHelmComputeProviderService } from "../compute_provider_definitions/companyhelm_service.ts";

type CompanyRecord = {
  id: string;
  clerk_organization_id: string | null;
  name: string;
};

type ComputeProviderDefinitionRecord = {
  companyId: string;
  description: string | null;
  id: string;
  isDefault: boolean;
  name: string;
  provider: ComputeProvider;
};

type BootstrapInsertableDatabase = DatabaseTransactionInterface & {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoNothing(): {
        returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
      };
      returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

type BootstrapInsertOperation = {
  onConflictDoNothing(): {
    returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
  };
};

/**
 * Owns the company-side provisioning steps that must exist before company-scoped API features can
 * run. That includes the company row itself, membership links, and the idempotent default catalog
 * records that requests expect to find after first sign-in.
 */
@injectable()
export class CompanyBootstrapService {
  static readonly DEFAULT_TASK_CATEGORY_NAMES = ["Backlog", "TODO", "Archive"] as const;
  private readonly companyHelmComputeProviderService: CompanyHelmComputeProviderService;

  constructor(
    @inject(CompanyHelmComputeProviderService)
    companyHelmComputeProviderService: CompanyHelmComputeProviderService,
  ) {
    this.companyHelmComputeProviderService = companyHelmComputeProviderService;
  }

  async findOrCreateCompany(
    transaction: DatabaseTransactionInterface,
    params: {
      providerSubject: string;
      name: string;
    },
  ): Promise<CompanyRecord> {
    const existingCompany = await this.findCompanyByClerkOrganizationId(
      transaction,
      params.providerSubject,
    );
    if (existingCompany) {
      return existingCompany;
    }

    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(companies)
      .values({
        clerkOrganizationId: params.providerSubject,
        name: params.name,
      }) as BootstrapInsertOperation;
    const insertResult = insertOperation
      .onConflictDoNothing()
      .returning?.({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
        name: companies.name,
      });
    const createdRows = insertResult ? await insertResult as CompanyRecord[] : [];
    const createdCompany = createdRows[0];
    if (!createdCompany) {
      const concurrentCompany = await this.findCompanyByClerkOrganizationId(
        transaction,
        params.providerSubject,
      );
      if (!concurrentCompany) {
        throw new Error("Failed to provision Clerk company.");
      }

      return concurrentCompany;
    }

    return createdCompany;
  }

  async ensureMembership(
    transaction: DatabaseTransactionInterface,
    params: {
      companyId: string;
      userId: string;
    },
  ): Promise<void> {
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(companyMembers)
      .values({
        companyId: params.companyId,
        userId: params.userId,
      }) as BootstrapInsertOperation;
    await insertOperation.onConflictDoNothing();
  }

  async ensureCompanyDefaults(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    await this.ensureCompanyHelmComputeProviderDefinition(transaction, companyId);
    await this.ensureDefaultTaskStages(transaction, companyId);
  }

  private async findCompanyByClerkOrganizationId(
    transaction: DatabaseTransactionInterface,
    providerSubject: string,
  ): Promise<CompanyRecord | null> {
    const [existingCompany] = await transaction
      .select({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.clerkOrganizationId, providerSubject))
      .limit(1) as CompanyRecord[];

    return existingCompany ?? null;
  }

  private async ensureCompanyHelmComputeProviderDefinition(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    const [existingDefinition] = await transaction
      .select({
        companyId: computeProviderDefinitions.companyId,
        description: computeProviderDefinitions.description,
        id: computeProviderDefinitions.id,
        isDefault: computeProviderDefinitions.isDefault,
        name: computeProviderDefinitions.name,
        provider: computeProviderDefinitions.provider,
      })
      .from(computeProviderDefinitions)
      .where(and(
        eq(computeProviderDefinitions.companyId, companyId),
        eq(computeProviderDefinitions.name, this.companyHelmComputeProviderService.getDefinitionName()),
      ))
      .limit(1) as ComputeProviderDefinitionRecord[];
    if (existingDefinition) {
      if (!this.companyHelmComputeProviderService.matchesDefinition(existingDefinition)) {
        throw new Error("Reserved CompanyHelm compute provider name is assigned to another provider.");
      }

      return;
    }

    const [existingDefaultDefinition] = await transaction
      .select({
        id: computeProviderDefinitions.id,
      })
      .from(computeProviderDefinitions)
      .where(and(
        eq(computeProviderDefinitions.companyId, companyId),
        eq(computeProviderDefinitions.isDefault, true),
      ))
      .limit(1);
    const now = new Date();
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(computeProviderDefinitions)
      .values({
        companyId,
        createdAt: now,
        createdByUserId: null,
        description: this.companyHelmComputeProviderService.getDefinitionDescription(),
        isDefault: !existingDefaultDefinition,
        name: this.companyHelmComputeProviderService.getDefinitionName(),
        provider: this.companyHelmComputeProviderService.getProvider(),
        updatedAt: now,
        updatedByUserId: null,
      }) as BootstrapInsertOperation;
    await insertOperation.onConflictDoNothing();
  }

  private async ensureDefaultTaskStages(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    for (const stageName of CompanyBootstrapService.DEFAULT_TASK_CATEGORY_NAMES) {
      const now = new Date();
      const insertOperation = insertableDatabase
        .insert(taskStages)
        .values({
          companyId,
          createdAt: now,
          name: stageName,
          updatedAt: now,
        }) as BootstrapInsertOperation;
      await insertOperation.onConflictDoNothing();
    }
  }
}
