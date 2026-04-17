import { inject, injectable } from "inversify";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineRecord,
} from "../routine_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type CreateRoutineMutationArguments = {
  input: {
    assignedAgentId: string;
    enabled?: boolean | null;
    instructions: string;
    name: string;
  };
};

/**
 * Creates one agent-assigned routine without creating a session until the first manual or scheduled
 * execution needs to queue instructions.
 */
@injectable()
export class CreateRoutineMutation extends Mutation<CreateRoutineMutationArguments, GraphqlRoutineRecord> {
  private readonly presenter: RoutineGraphqlPresenter;
  private readonly routineService: RoutineService;

  constructor(
    @inject(RoutineService) routineService: RoutineService,
    @inject(RoutineGraphqlPresenter) presenter: RoutineGraphqlPresenter = new RoutineGraphqlPresenter(),
  ) {
    super();
    this.presenter = presenter;
    this.routineService = routineService;
  }

  protected resolve = async (
    arguments_: CreateRoutineMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineRecord> => {
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const routine = await this.routineService.createRoutine(context.app_runtime_transaction_provider, {
      assignedAgentId: arguments_.input.assignedAgentId,
      companyId: context.authSession.company.id,
      enabled: arguments_.input.enabled,
      instructions: arguments_.input.instructions,
      name: arguments_.input.name,
      userId: context.authSession.user.id,
    });

    return this.presenter.serializeRoutine(routine);
  };
}
