import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { ApiLogger } from "../../log/api_logger.ts";
import { CompanyDeletionDispatcher } from "../../services/company_deletions/dispatcher.ts";
import {
  CompanyDeletionRequestService,
  type CompanyDeletionRequestStatus,
} from "../../services/company_deletions/request_service.ts";
import { CompanyMemberPermissionService } from "../../services/company_member_permission_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteCompanyMutationArguments = {
  input: {
    confirmationName: string;
  };
};

type GraphqlCompanyDeletionRequestRecord = {
  companyId: string;
  companyName: string;
  completedAt: string | null;
  id: string;
  lastError: string | null;
  requestedAt: string;
  status: CompanyDeletionRequestStatus;
};

/**
 * Records an authenticated company's deletion request after exact-name confirmation and kicks the
 * shared deletion dispatcher so the same durable row can be handled immediately or by the sweep.
 */
@injectable()
export class DeleteCompanyMutation extends Mutation<
  DeleteCompanyMutationArguments,
  GraphqlCompanyDeletionRequestRecord
> {
  private readonly dispatcher: CompanyDeletionDispatcher;
  private readonly logger: PinoLogger | null;
  private readonly permissionService: CompanyMemberPermissionService;
  private readonly requestService: CompanyDeletionRequestService;

  constructor(
    @inject(CompanyDeletionRequestService)
    requestService: CompanyDeletionRequestService = new CompanyDeletionRequestService(),
    @inject(CompanyDeletionDispatcher)
    dispatcher: CompanyDeletionDispatcher = {
      async dispatchRequest() {},
    } as never,
    @inject(ApiLogger) logger?: ApiLogger,
    @inject(CompanyMemberPermissionService)
    permissionService: CompanyMemberPermissionService = new CompanyMemberPermissionService(),
  ) {
    super();
    this.dispatcher = dispatcher;
    this.logger = logger?.child({
      mutation: "delete_company",
    }) ?? null;
    this.permissionService = permissionService;
    this.requestService = requestService;
  }

  protected resolve = async (
    arguments_: DeleteCompanyMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCompanyDeletionRequestRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.confirmationName !== context.authSession.company.name) {
      throw new Error("Type the company name exactly to delete this company.");
    }
    await this.permissionService.requireActiveAdmin({
      action: "delete companies",
      companyId: context.authSession.company.id,
      transactionProvider: context.app_runtime_transaction_provider,
      userId: context.authSession.user.id,
    });

    const request = await this.requestService.createDeletionRequest(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        requestedByUserId: context.authSession.user.id,
      },
    );
    try {
      await this.dispatcher.dispatchRequest(request.id);
    } catch (error) {
      this.logger?.warn({
        error,
        requestId: request.id,
      }, "company deletion request persisted but immediate dispatch failed");
    }

    return {
      companyId: request.companyId,
      companyName: request.companyName,
      completedAt: request.completedAt?.toISOString() ?? null,
      id: request.id,
      lastError: request.lastError,
      requestedAt: request.requestedAt.toISOString(),
      status: request.status,
    };
  };
}
