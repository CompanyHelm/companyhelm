import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companyGithubInstallations } from "../../db/schema.ts";
import { GithubClient } from "../../github/client.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteGithubInstallationMutationArguments = {
  input: {
    installationId: string;
  };
};

type GithubInstallationRecord = {
  installationId: number;
};

type GraphqlDeleteGithubInstallationPayload = {
  deletedInstallationId: string;
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
      returning(selection?: Record<string, unknown>): Promise<GithubInstallationRecord[]>;
    };
  };
};

/**
 * Removes a linked GitHub installation from the authenticated company, cascading cached repos.
 */
@injectable()
export class DeleteGithubInstallationMutation extends Mutation<
  DeleteGithubInstallationMutationArguments,
  GraphqlDeleteGithubInstallationPayload
> {
  protected resolve = async (
    arguments_: DeleteGithubInstallationMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlDeleteGithubInstallationPayload> => {
    const installationId = GithubClient.validateInstallationId(arguments_.input.installationId);

    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const [deletedInstallation] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      return deletableDatabase
        .delete(companyGithubInstallations)
        .where(and(
          eq(companyGithubInstallations.companyId, context.authSession.company.id),
          eq(companyGithubInstallations.installationId, installationId),
        ))
        .returning({
          installationId: companyGithubInstallations.installationId,
        });
    });

    if (!deletedInstallation) {
      throw new Error("GitHub installation not found.");
    }

    return {
      deletedInstallationId: String(deletedInstallation.installationId),
    };
  };
}
