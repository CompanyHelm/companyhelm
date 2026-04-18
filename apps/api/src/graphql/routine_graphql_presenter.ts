import type {
  RoutineCronTriggerRecord,
  RoutineRecord,
  RoutineRunRecord,
} from "../services/routines/types.ts";
import { injectable } from "inversify";

export type GraphqlRoutineCronTriggerRecord = {
  createdAt: string;
  cronPattern: string;
  enabled: boolean;
  id: string;
  routineId: string;
  timezone: string;
  type: string;
  updatedAt: string;
};

export type GraphqlRoutineRunRecord = {
  bullmqJobId: string | null;
  createdAt: string;
  errorMessage: string | null;
  finishedAt: string | null;
  id: string;
  routineId: string;
  sessionId: string | null;
  source: string;
  startedAt: string | null;
  status: string;
  triggerId: string | null;
  updatedAt: string;
};

export type GraphqlRoutineRecord = {
  assignedAgentId: string;
  assignedAgentName: string;
  createdAt: string;
  enabled: boolean;
  id: string;
  instructions: string;
  lastRun: GraphqlRoutineRunRecord | null;
  name: string;
  overlapPolicy: string;
  sessionId: string | null;
  triggers: GraphqlRoutineCronTriggerRecord[];
  updatedAt: string;
};

/**
 * Serializes routine domain records into the date-string shape expected by the GraphQL schema and
 * Relay generated types.
 */
@injectable()
export class RoutineGraphqlPresenter {
  serializeRoutine(routine: RoutineRecord): GraphqlRoutineRecord {
    return {
      assignedAgentId: routine.assignedAgentId,
      assignedAgentName: routine.assignedAgentName,
      createdAt: routine.createdAt.toISOString(),
      enabled: routine.enabled,
      id: routine.id,
      instructions: routine.instructions,
      lastRun: routine.lastRun ? this.serializeRun(routine.lastRun) : null,
      name: routine.name,
      overlapPolicy: routine.overlapPolicy,
      sessionId: routine.sessionId,
      triggers: routine.triggers.map((trigger) => this.serializeCronTrigger(trigger)),
      updatedAt: routine.updatedAt.toISOString(),
    };
  }

  serializeCronTrigger(trigger: RoutineCronTriggerRecord): GraphqlRoutineCronTriggerRecord {
    return {
      createdAt: trigger.createdAt.toISOString(),
      cronPattern: trigger.cronPattern,
      enabled: trigger.enabled,
      id: trigger.id,
      routineId: trigger.routineId,
      timezone: trigger.timezone,
      type: trigger.type,
      updatedAt: trigger.updatedAt.toISOString(),
    };
  }

  serializeRun(run: RoutineRunRecord): GraphqlRoutineRunRecord {
    return {
      bullmqJobId: run.bullmqJobId,
      createdAt: run.createdAt.toISOString(),
      errorMessage: run.errorMessage,
      finishedAt: run.finishedAt?.toISOString() ?? null,
      id: run.id,
      routineId: run.routineId,
      sessionId: run.sessionId,
      source: run.source,
      startedAt: run.startedAt?.toISOString() ?? null,
      status: run.status,
      triggerId: run.triggerId,
      updatedAt: run.updatedAt.toISOString(),
    };
  }
}
