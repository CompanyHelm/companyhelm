import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companySettings } from "../db/schema.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";

type CompanySettingsRecord = {
  companyId: string;
  baseSystemPrompt: string | null;
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
 * persist the base system prompt layer that should apply to every agent in the company.
 */
@injectable()
export class CompanySettingsService {
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

      return settingsRecord ?? {
        companyId,
        baseSystemPrompt: null,
      };
    });
  }

  async updateSettings(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      baseSystemPrompt?: string | null;
    },
  ): Promise<CompanySettingsRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const nextBaseSystemPrompt = this.resolveBaseSystemPrompt(input.baseSystemPrompt);
      const [existingSettings] = await selectableDatabase
        .select({
          companyId: companySettings.companyId,
        })
        .from(companySettings)
        .where(eq(companySettings.companyId, input.companyId)) as Array<{ companyId: string }>;

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

        return createdSettings;
      }

      const [updatedSettings] = await updatableDatabase
        .update(companySettings)
        .set({
          base_system_prompt: nextBaseSystemPrompt,
        })
        .where(eq(companySettings.companyId, input.companyId))
        .returning?.(this.selection()) as CompanySettingsRecord[];
      if (!updatedSettings) {
        throw new Error("Failed to update company settings.");
      }

      return updatedSettings;
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
}
