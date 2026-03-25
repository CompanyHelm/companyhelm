import { readFileSync } from "node:fs";
import { injectable } from "inversify";
import type { AuthSession } from "../../auth/auth_provider.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type MeQueryResult = {
  company: AuthSession["company"];
  serverVersion: string;
  user: Omit<AuthSession["user"], "provider" | "providerSubject">;
};

/**
 * Resolves the authenticated user and company from the bearer-token-backed request context.
 */
@injectable()
export class MeQueryResolver extends Resolver<MeQueryResult> {
  private static readonly serverVersion = MeQueryResolver.readServerVersion();

  protected resolve = async (context: GraphqlRequestContext): Promise<MeQueryResult> => {
    if (!context.authSession) {
      throw new Error("Authentication required.");
    }

    return {
      company: context.authSession.company,
      serverVersion: MeQueryResolver.serverVersion,
      user: context.authSession.user,
    };
  };

  private static readServerVersion(): string {
    const packageDocument = JSON.parse(
      readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
    ) as {
      version?: string;
    };

    if (typeof packageDocument.version !== "string" || packageDocument.version.length === 0) {
      throw new Error("apps/api/package.json is missing a version.");
    }

    return packageDocument.version;
  }
}
