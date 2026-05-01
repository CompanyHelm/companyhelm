import { inject, injectable } from "inversify";
import { CompanyDeletionExecutor } from "../../services/company_deletions/executor.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeletePlatformAdminCompanyMutationArguments = {
  input: {
    companyId: string;
    confirmationName: string;
  };
};

type DeletePlatformAdminCompanyPayload = {
  id: string;
  name: string;
};

/**
 * Lets platform admins remove a company immediately after exact-name confirmation, bypassing the
 * self-service deletion queue while still running the shared destructive cleanup sequence.
 */
@injectable()
export class DeletePlatformAdminCompanyMutation extends Mutation<
  DeletePlatformAdminCompanyMutationArguments,
  DeletePlatformAdminCompanyPayload
> {
  private readonly deletionExecutor: CompanyDeletionExecutor;

  constructor(
    @inject(CompanyDeletionExecutor) deletionExecutor: CompanyDeletionExecutor = {} as never,
  ) {
    super();
    this.deletionExecutor = deletionExecutor;
  }

  protected resolve = async (
    arguments_: DeletePlatformAdminCompanyMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<DeletePlatformAdminCompanyPayload> => {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }

    const company = await this.deletionExecutor.loadCompany(arguments_.input.companyId);
    if (arguments_.input.confirmationName !== company.name) {
      throw new Error("Type the company name exactly to delete this company.");
    }

    const deletedCompany = await this.deletionExecutor.deleteCompany({
      companyId: company.id,
    });

    return {
      id: deletedCompany.id,
      name: deletedCompany.name,
    };
  };
}
