import { inject, injectable } from "inversify";
import {
  CompanyMemberInvitationService,
  type CompanyMemberInvitationRecord,
} from "../../services/company_member_invitation_service.ts";
import { CompanyMemberPermissionService } from "../../services/company_member_permission_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RevokeCompanyMemberInvitationMutationArguments = {
  input: {
    userId: string;
  };
};

/**
 * Revokes pending CompanyHelm member invitations through the same member management boundary used
 * for listing and creating invitations.
 */
@injectable()
export class RevokeCompanyMemberInvitationMutation extends Mutation<
  RevokeCompanyMemberInvitationMutationArguments,
  CompanyMemberInvitationRecord
> {
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

  protected resolve = async (
    arguments_: RevokeCompanyMemberInvitationMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<CompanyMemberInvitationRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    await this.permissionService.requireActiveAdmin({
      action: "revoke member invitations",
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: context.authSession.user.id,
    });

    return this.invitationService.revokeInvitation({
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: arguments_.input.userId,
    });
  };
}
