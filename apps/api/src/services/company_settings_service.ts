import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companyManagedModelProviderSettings, companySettings, platformModels } from "../db/schema.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";

type CompanySettingsRecord = {
  companyId: string;
  baseSystemPrompt: string | null;
  defaultManagedPlatformModelId: string | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

/**
 * Owns the single company-scoped prompt override record. It provides a stable way to read and
 * persist the shared agent settings that should apply to every agent in the company.
 */
@injectable()
export class CompanySettingsService {
  private readonly managedProviderKey = "companyhelm";

  async getSettings(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<CompanySettingsRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [settingsRecord] = await selectableDatabase
        .select(this.selection())
        .from(companySettings)
        .where(eq(companySettings.companyId, companyId)) as CompanySettingsRecord[];
      const managedProviderSettings = await this.getManagedProviderSettings(selectableDatabase, companyId);

      return {
        companyId,
        baseSystemPrompt: settingsRecord?.baseSystemPrompt ?? null,
        defaultManagedPlatformModelId: managedProviderSettings?.defaultManagedPlatformModelId ?? null,
      };
    });
  }

  async updateSettings(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      baseSystemPrompt?: string | null;
      defaultManagedPlatformModelId?: string | null;
    },
  ): Promise<CompanySettingsRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [existingSettings] = await selectableDatabase
        .select(this.selection())
        .from(companySettings)
        .where(eq(companySettings.companyId, input.companyId)) as CompanySettingsRecord[];
      const existingManagedProviderSettings = await this.getManagedProviderSettings(
        selectableDatabase,
        input.companyId,
      );
      const nextBaseSystemPrompt = input.baseSystemPrompt === undefined
        ? (existingSettings?.baseSystemPrompt ?? null)
        : this.resolveBaseSystemPrompt(input.baseSystemPrompt);
      const nextDefaultManagedPlatformModelId = input.defaultManagedPlatformModelId === undefined
        ? (existingManagedProviderSettings?.defaultManagedPlatformModelId ?? null)
        : await this.resolveDefaultManagedPlatformModelId(
          selectableDatabase,
          input.defaultManagedPlatformModelId,
        );

      if (!existingSettings) {
        const [createdSettings] = await insertableDatabase
          .insert(companySettings)
          .values({
            companyId: input.companyId,
            base_system_prompt: nextBaseSystemPrompt,
          })
          .returning?.(this.selection()) as CompanySettingsRecord[];
        if (!createdSettings) {
          throw new Error("Failed to create company settings.");
        }

        if (input.defaultManagedPlatformModelId !== undefined) {
          await this.upsertManagedProviderSettings(
            insertableDatabase,
            updatableDatabase,
            input.companyId,
            nextDefaultManagedPlatformModelId,
            false,
          );
        }

        return {
          ...createdSettings,
          defaultManagedPlatformModelId: nextDefaultManagedPlatformModelId,
        };
      }

      await updatableDatabase
        .update(companySettings)
        .set({
          base_system_prompt: nextBaseSystemPrompt,
        })
        .where(eq(companySettings.companyId, input.companyId))
        .returning?.(this.selection()) as CompanySettingsRecord[];
      if (input.defaultManagedPlatformModelId !== undefined || existingManagedProviderSettings) {
        await this.upsertManagedProviderSettings(
          insertableDatabase,
          updatableDatabase,
          input.companyId,
          nextDefaultManagedPlatformModelId,
          Boolean(existingManagedProviderSettings),
        );
      }
      const [updatedSettings] = await selectableDatabase
        .select(this.selection())
        .from(companySettings)
        .where(eq(companySettings.companyId, input.companyId)) as CompanySettingsRecord[];
      if (!updatedSettings) {
        throw new Error("Failed to update company settings.");
      }

      return {
        ...updatedSettings,
        defaultManagedPlatformModelId: nextDefaultManagedPlatformModelId,
      };
    });
  }

  private resolveBaseSystemPrompt(baseSystemPrompt: string | null | undefined): string | null {
    if (baseSystemPrompt === undefined || baseSystemPrompt === null || baseSystemPrompt === "") {
      return null;
    }

    return baseSystemPrompt;
  }

  private selection(): Record<string, unknown> {
    return {
      companyId: companySettings.companyId,
      baseSystemPrompt: companySettings.base_system_prompt,
    };
  }

  private managedProviderSelection(): Record<string, unknown> {
    return {
      companyId: companyManagedModelProviderSettings.companyId,
      defaultManagedPlatformModelId: companyManagedModelProviderSettings.defaultPlatformModelId,
    };
  }

  private async getManagedProviderSettings(
    selectableDatabase: SelectableDatabase,
    companyId: string,
  ): Promise<{ companyId: string; defaultManagedPlatformModelId: string | null } | null> {
    const [settingsRecord] = await selectableDatabase
      .select(this.managedProviderSelection())
      .from(companyManagedModelProviderSettings)
      .where(and(
        eq(companyManagedModelProviderSettings.companyId, companyId),
        eq(companyManagedModelProviderSettings.providerKey, this.managedProviderKey),
      )) as Array<{
        companyId: string;
        defaultManagedPlatformModelId: string | null;
      }>;

    return settingsRecord ?? null;
  }

  private async resolveDefaultManagedPlatformModelId(
    selectableDatabase: SelectableDatabase,
    platformModelId: string | null | undefined,
  ): Promise<string | null> {
    if (!platformModelId) {
      return null;
    }

    const [platformModel] = await selectableDatabase
      .select({
        id: platformModels.id,
      })
      .from(platformModels)
      .where(eq(platformModels.id, platformModelId)) as Array<{ id: string }>;
    if (!platformModel) {
      throw new Error("Platform model not found.");
    }

    return platformModel.id;
  }

  private async upsertManagedProviderSettings(
    insertableDatabase: InsertableDatabase,
    updatableDatabase: UpdatableDatabase,
    companyId: string,
    defaultManagedPlatformModelId: string | null,
    hasExistingSettings: boolean,
  ): Promise<void> {
    const now = new Date();
    if (!hasExistingSettings) {
      await insertableDatabase
        .insert(companyManagedModelProviderSettings)
        .values({
          companyId,
          providerKey: this.managedProviderKey,
          defaultPlatformModelId: defaultManagedPlatformModelId,
          createdAt: now,
          updatedAt: now,
        })
        .returning?.(this.managedProviderSelection());
      return;
    }

    await updatableDatabase
      .update(companyManagedModelProviderSettings)
      .set({
        defaultPlatformModelId: defaultManagedPlatformModelId,
        updatedAt: now,
      })
      .where(and(
        eq(companyManagedModelProviderSettings.companyId, companyId),
        eq(companyManagedModelProviderSettings.providerKey, this.managedProviderKey),
      ))
      .returning?.(this.managedProviderSelection());
  }
}
