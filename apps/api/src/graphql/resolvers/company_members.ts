import { inject, injectable } from "inversify";
import {
  CompanyMemberInvitationService,
  type CompanyMemberAccessRecord,
} from "../../services/company_member_invitation_service.ts";
import { CompanyMemberPermissionService } from "../../services/company_member_permission_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

/**
 * Returns Clerk organization access through the API so the settings page can load members and
 * pending invitations with one GraphQL request instead of running Clerk frontend list calls.
 */
@injectable()
export class CompanyMembersQueryResolver extends Resolver<CompanyMemberAccessRecord[]> {
  private readonly invitationService: CompanyMemberInvitationService;
  private readonly permissionService: CompanyMemberPermissionService;

  constructor(
    @inject(CompanyMemberInvitationService)
    invitationService: CompanyMemberInvitationService,
    @inject(CompanyMemberPermissionService)
    permissionService: CompanyMemberPermissionService = new CompanyMemberPermissionService(),
  ) {
    super();
    this.invitationService = invitationService;
    this.permissionService = permissionService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<CompanyMemberAccessRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const membership = await this.permissionService.getMembership({
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: context.authSession.user.id,
    });
    if (membership?.status !== "active") {
      throw new Error("Authentication required.");
    }

    return this.invitationService.listMembers({
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
    });
  };
}
