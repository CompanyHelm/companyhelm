import { injectable } from "inversify";
import type { AuthSession } from "../../auth/auth_provider.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type MeQueryResult = {
  company: AuthSession["company"];
  user: Omit<AuthSession["user"], "provider" | "providerSubject">;
};

/**
 * Resolves the authenticated user and company from the bearer-token-backed request context.
 */
@injectable("Singleton")
export class MeQueryResolver extends Resolver<MeQueryResult> {
  protected resolve = async (context: GraphqlRequestContext): Promise<MeQueryResult> => {
    if (!context.authSession) {
      throw new Error("Authentication required.");
    }

    return {
      company: context.authSession.company,
      user: context.authSession.user,
    };
  };
}
