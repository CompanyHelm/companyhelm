import { asc, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companyGithubInstallations } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type GithubInstallationRecord = {
  accountLogin: string | null;
  installationId: number;
  createdAt: Date;
};

type GraphqlGithubInstallationRecord = {
  accountLogin: string | null;
  id: string;
  installationId: string;
  createdAt: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        orderBy(...fields: unknown[]): Promise<GithubInstallationRecord[]>;
      };
    };
  };
};

/**
 * Lists the GitHub App installations linked to the authenticated company.
 */
@injectable()
export class GithubInstallationsQueryResolver extends Resolver<GraphqlGithubInstallationRecord[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlGithubInstallationRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const installations = await selectableDatabase
        .select({
          accountLogin: companyGithubInstallations.accountLogin,
          installationId: companyGithubInstallations.installationId,
          createdAt: companyGithubInstallations.createdAt,
        })
        .from(companyGithubInstallations)
        .where(eq(companyGithubInstallations.companyId, companyId))
        .orderBy(asc(companyGithubInstallations.installationId));

      return installations.map((installation) => ({
        accountLogin: installation.accountLogin,
        id: String(installation.installationId),
        installationId: String(installation.installationId),
        createdAt: installation.createdAt.toISOString(),
      }));
    });
  };
}
