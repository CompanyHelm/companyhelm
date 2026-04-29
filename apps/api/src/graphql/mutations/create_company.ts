import { inject, injectable } from "inversify";
import {
  CompanyCreationService,
  type CreatedCompanyRecord,
} from "../../services/company_creation/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateCompanyMutationArguments = {
  input: {
    name: string;
  };
};

/**
 * Creates a free company for the signed-in user through the DB-first company creation service so
 * Clerk receives a mirrored organization only after CompanyHelm has allocated the canonical slug.
 */
@injectable()
export class CreateCompanyMutation extends Mutation<CreateCompanyMutationArguments, CreatedCompanyRecord> {
  private readonly companyCreationService: CompanyCreationService;

  constructor(
    @inject(CompanyCreationService)
    companyCreationService: CompanyCreationService,
  ) {
    super();
    this.companyCreationService = companyCreationService;
  }

  protected resolve = async (
    arguments_: CreateCompanyMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<CreatedCompanyRecord> => {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }

    return this.companyCreationService.createCompany({
      clerkUserId: context.authSession.user.provider === "clerk"
        ? context.authSession.user.providerSubject
        : null,
      name: arguments_.input.name,
      userId: context.authSession.user.id,
    });
  };
}
