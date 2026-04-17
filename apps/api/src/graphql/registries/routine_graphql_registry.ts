import { inject, injectable } from "inversify";
import { RoutineExecutionService } from "../../services/routines/execution.ts";
import { RoutineSchedulerSyncService } from "../../services/routines/scheduler_sync.ts";
import { RoutineService } from "../../services/routines/service.ts";
import { CreateRoutineCronTriggerMutation } from "../mutations/create_routine_cron_trigger.ts";
import { CreateRoutineMutation } from "../mutations/create_routine.ts";
import { DeleteRoutineTriggerMutation } from "../mutations/delete_routine_trigger.ts";
import { DeleteRoutineMutation } from "../mutations/delete_routine.ts";
import { TriggerRoutineMutation } from "../mutations/trigger_routine.ts";
import { UpdateRoutineCronTriggerMutation } from "../mutations/update_routine_cron_trigger.ts";
import { UpdateRoutineMutation } from "../mutations/update_routine.ts";
import { RoutineQueryResolver } from "../resolvers/routine.ts";
import { RoutineRunsQueryResolver } from "../resolvers/routine_runs.ts";
import { RoutinesQueryResolver } from "../resolvers/routines.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

/**
 * Groups routine queries and mutations behind one registry so routine scheduling stays an
 * independent GraphQL slice while still merging into the single Mercurius resolver object.
 */
@injectable()
export class RoutineGraphqlRegistry implements GraphqlRegistryInterface {
  constructor(
    @inject(RoutineQueryResolver)
    private readonly routineQueryResolver: RoutineQueryResolver =
      new RoutineQueryResolver(new RoutineService()),
    @inject(RoutineRunsQueryResolver)
    private readonly routineRunsQueryResolver: RoutineRunsQueryResolver =
      new RoutineRunsQueryResolver(new RoutineService()),
    @inject(RoutinesQueryResolver)
    private readonly routinesQueryResolver: RoutinesQueryResolver =
      new RoutinesQueryResolver(new RoutineService()),
    @inject(CreateRoutineMutation)
    private readonly createRoutineMutation: CreateRoutineMutation =
      new CreateRoutineMutation(new RoutineService()),
    @inject(CreateRoutineCronTriggerMutation)
    private readonly createRoutineCronTriggerMutation: CreateRoutineCronTriggerMutation =
      new CreateRoutineCronTriggerMutation(new RoutineService(), RoutineGraphqlRegistry.createMissingScheduler()),
    @inject(DeleteRoutineMutation)
    private readonly deleteRoutineMutation: DeleteRoutineMutation =
      new DeleteRoutineMutation(new RoutineService(), RoutineGraphqlRegistry.createMissingScheduler()),
    @inject(DeleteRoutineTriggerMutation)
    private readonly deleteRoutineTriggerMutation: DeleteRoutineTriggerMutation =
      new DeleteRoutineTriggerMutation(new RoutineService(), RoutineGraphqlRegistry.createMissingScheduler()),
    @inject(TriggerRoutineMutation)
    private readonly triggerRoutineMutation: TriggerRoutineMutation =
      new TriggerRoutineMutation(RoutineGraphqlRegistry.createMissingExecutionService()),
    @inject(UpdateRoutineMutation)
    private readonly updateRoutineMutation: UpdateRoutineMutation =
      new UpdateRoutineMutation(new RoutineService(), RoutineGraphqlRegistry.createMissingScheduler()),
    @inject(UpdateRoutineCronTriggerMutation)
    private readonly updateRoutineCronTriggerMutation: UpdateRoutineCronTriggerMutation =
      new UpdateRoutineCronTriggerMutation(new RoutineService(), RoutineGraphqlRegistry.createMissingScheduler()),
  ) {}

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        CreateRoutine: this.createRoutineMutation.execute,
        CreateRoutineCronTrigger: this.createRoutineCronTriggerMutation.execute,
        DeleteRoutine: this.deleteRoutineMutation.execute,
        DeleteRoutineTrigger: this.deleteRoutineTriggerMutation.execute,
        TriggerRoutine: this.triggerRoutineMutation.execute,
        UpdateRoutine: this.updateRoutineMutation.execute,
        UpdateRoutineCronTrigger: this.updateRoutineCronTriggerMutation.execute,
      },
      Query: {
        Routine: this.routineQueryResolver.execute,
        RoutineRuns: this.routineRunsQueryResolver.execute,
        Routines: this.routinesQueryResolver.execute,
      },
    };
  }

  private static createMissingExecutionService(): RoutineExecutionService {
    return {
      async execute() {
        throw new Error("Routine execution service is not configured.");
      },
    } as never;
  }

  private static createMissingScheduler(): RoutineSchedulerSyncService {
    return {
      async removeCronTrigger() {
        throw new Error("Routine scheduler service is not configured.");
      },
      async syncCronTrigger() {
        throw new Error("Routine scheduler service is not configured.");
      },
      async syncEnabledCronTriggers() {
        throw new Error("Routine scheduler service is not configured.");
      },
    } as never;
  }
}
