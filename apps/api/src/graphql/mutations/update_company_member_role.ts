import { inject, injectable } from "inversify";
import {
  CompanyMemberInvitationService,
  type CompanyMemberAccessRecord,
} from "../../services/company_member_invitation_service.ts";
import type { CompanyMemberRole } from "../../services/company_member_permission_service.ts";
import { CompanyMemberPermissionService } from "../../services/company_member_permission_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateCompanyMemberRoleMutationArguments = {
  input: {
    role: CompanyMemberRole;
    userId: string;
  };
};

/**
 * Updates a CompanyHelm member role after checking the caller's active admin entitlement.
 */
@injectable()
export class UpdateCompanyMemberRoleMutation extends Mutation<
  UpdateCompanyMemberRoleMutationArguments,
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
    arguments_: UpdateCompanyMemberRoleMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<CompanyMemberAccessRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    await this.permissionService.requireActiveAdmin({
      action: "manage member roles",
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: context.authSession.user.id,
    });

    return this.invitationService.updateMemberRole({
      companyId: context.authSession.company.id,
      role: arguments_.input.role,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: arguments_.input.userId,
    });
  };
}
