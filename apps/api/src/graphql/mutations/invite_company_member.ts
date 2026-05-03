import { inject, injectable } from "inversify";
import {
  CompanyMemberInvitationService,
  type CompanyMemberInvitationRecord,
} from "../../services/company_member_invitation_service.ts";
import type { CompanyMemberRole } from "../../services/company_member_permission_service.ts";
import { CompanyMemberPermissionService } from "../../services/company_member_permission_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type InviteCompanyMemberMutationArguments = {
  input: {
    emailAddress: string;
    role: CompanyMemberRole;
  };
};

/**
 * Creates a pending CompanyHelm member row so local workspace roles remain the source of truth for
 * product permissions.
 */
@injectable()
export class InviteCompanyMemberMutation extends Mutation<
  InviteCompanyMemberMutationArguments,
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
    arguments_: InviteCompanyMemberMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<CompanyMemberInvitationRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    await this.permissionService.requireActiveAdmin({
      action: "invite company members",
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: context.authSession.user.id,
    });

    return this.invitationService.inviteMember({
      companyId: context.authSession.company.id,
      emailAddress: arguments_.input.emailAddress,
      role: arguments_.input.role,
      transactionProvider: context.app_runtime_transaction_provider,
    });
  };
}
