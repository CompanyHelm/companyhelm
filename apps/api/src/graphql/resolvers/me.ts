import { injectable } from "inversify";
import type { AuthSession } from "../../auth/auth_provider.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type MeQueryResult = Pick<AuthSession, "company" | "user">;

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
      user: context.authSession.user,
      company: context.authSession.company,
    };
  };
}
