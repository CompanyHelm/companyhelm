import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companyModelProviderDefaults } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

/**
 * Promotes the virtual CompanyHelm-managed provider to the company default used for new agents.
 * The selected provider is stored separately from concrete BYO credential rows because managed
 * providers do not have a tenant-owned credential id.
 */
@injectable()
export class SetDefaultManagedModelProviderCredentialMutation extends Mutation<
  Record<string, never>,
  boolean
> {
  protected resolve = async (
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): Promise<boolean> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const companyId = context.authSession.company.id;
    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      await this.upsertProviderDefault(
        updatableDatabase,
        companyId,
      );

      return true;
    });
  };

  private async upsertProviderDefault(
    updatableDatabase: UpdatableDatabase,
    companyId: string,
  ): Promise<void> {
    const now = new Date();
    await updatableDatabase
      .update(companyModelProviderDefaults)
      .set({
        modelCredentialSource: "platform",
        modelProviderCredentialId: null,
        updatedAt: now,
      })
      .where(eq(companyModelProviderDefaults.companyId, companyId));
  }
}
