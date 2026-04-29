import { readFileSync } from "node:fs";
import { inject, injectable } from "inversify";
import type { AuthSession } from "../../auth/auth_provider.ts";
import {
  CompanyMemberPermissionService,
  type CompanyMemberEntitlements,
  type CompanyMemberPermissionRecord,
} from "../../services/company_member_permission_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type MeQueryResult = {
  company: AuthSession["company"];
  companyEntitlements: CompanyMemberEntitlements;
  companyMembership: CompanyMemberPermissionRecord | null;
  serverVersion: string;
  user: Omit<AuthSession["user"], "provider" | "providerSubject">;
};

/**
 * Resolves the authenticated user and company from the bearer-token-backed request context.
 */
@injectable()
export class MeQueryResolver extends Resolver<MeQueryResult> {
  private static readonly serverVersion = MeQueryResolver.readServerVersion();
  private readonly permissionService: CompanyMemberPermissionService;

  constructor(
    @inject(CompanyMemberPermissionService)
    permissionService: CompanyMemberPermissionService = new CompanyMemberPermissionService(),
  ) {
    super();
    this.permissionService = permissionService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<MeQueryResult> => {
    if (!context.authSession) {
      throw new Error("Authentication required.");
    }
    const membership = context.authSession.company && context.app_runtime_transaction_provider
      ? await this.permissionService.getMembership({
        companyId: context.authSession.company.id,
        transactionProvider: context.app_runtime_transaction_provider,
        userId: context.authSession.user.id,
      })
      : null;

    return {
      company: context.authSession.company,
      companyEntitlements: this.permissionService.buildEntitlements(membership),
      companyMembership: membership,
      serverVersion: MeQueryResolver.serverVersion,
      user: {
        ...context.authSession.user,
        isPlatformAdmin: context.authSession.user.isPlatformAdmin === true,
      },
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
