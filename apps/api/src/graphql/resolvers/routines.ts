import { inject, injectable } from "inversify";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineRecord,
} from "../routine_graphql_presenter.ts";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

/**
 * Lists company routines with their trigger summaries so the routines page can render one complete
 * management view without per-row follow-up queries.
 */
@injectable()
export class RoutinesQueryResolver extends Resolver<GraphqlRoutineRecord[]> {
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

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlRoutineRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const routines = await this.routineService.listRoutines(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );
    return routines.map((routine) => this.presenter.serializeRoutine(routine));
  };
}
