import { inject, injectable } from "inversify";
import {
  CompanyMemberInvitationService,
  type CompanyMemberAccessRecord,
} from "../../services/company_member_invitation_service.ts";
import { CompanyMemberPermissionService } from "../../services/company_member_permission_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RemoveCompanyMemberMutationArguments = {
  input: {
    userId: string;
  };
};

/**
 * Removes active organization access through the CompanyHelm membership boundary while leaving
 * historical user-owned records intact for auditability and task history.
 */
@injectable()
export class RemoveCompanyMemberMutation extends Mutation<
  RemoveCompanyMemberMutationArguments,
  CompanyMemberAccessRecord
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
    arguments_: RemoveCompanyMemberMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<CompanyMemberAccessRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.userId === context.authSession.user.id) {
      throw new Error("You cannot remove yourself from the company.");
    }
    await this.permissionService.requireActiveAdmin({
      action: "remove company members",
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: context.authSession.user.id,
    });

    return this.invitationService.removeMember({
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: arguments_.input.userId,
    });
  };
}
