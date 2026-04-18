export type RoutineOverlapPolicy = "skip";
export type RoutineRunSource = "manual" | "scheduled";
export type RoutineRunStatus = "queued" | "running" | "prompt_queued" | "skipped" | "failed";
export type RoutineTriggerType = "cron";

export type RoutineCronTriggerRecord = {
  createdAt: Date;
  cronPattern: string;
  enabled: boolean;
  id: string;
  routineId: string;
  timezone: string;
  type: RoutineTriggerType;
  updatedAt: Date;
};

export type RoutineRunRecord = {
  bullmqJobId: string | null;
  createdAt: Date;
  errorMessage: string | null;
  finishedAt: Date | null;
  id: string;
  routineId: string;
  sessionId: string | null;
  source: RoutineRunSource;
  startedAt: Date | null;
  status: RoutineRunStatus;
  triggerId: string | null;
  updatedAt: Date;
};

export type RoutineRecord = {
  assignedAgentId: string;
  assignedAgentName: string;
  createdAt: Date;
  enabled: boolean;
  id: string;
  instructions: string;
  lastRun: RoutineRunRecord | null;
  name: string;
  overlapPolicy: RoutineOverlapPolicy;
  sessionId: string | null;
  triggers: RoutineCronTriggerRecord[];
  updatedAt: Date;
};

export type RoutineCreateInput = {
  assignedAgentId: string;
  companyId: string;
  enabled?: boolean | null;
  instructions: string;
  name: string;
  userId?: string | null;
};

export type RoutineUpdateInput = {
  assignedAgentId?: string | null;
  companyId: string;
  enabled?: boolean | null;
  instructions?: string | null;
  name?: string | null;
  routineId: string;
  userId?: string | null;
};

export type RoutineCronTriggerCreateInput = {
  companyId: string;
  cronPattern: string;
  enabled?: boolean | null;
  routineId: string;
  timezone: string;
};

export type RoutineCronTriggerUpdateInput = {
  companyId: string;
  cronPattern?: string | null;
  enabled?: boolean | null;
  timezone?: string | null;
  triggerId: string;
};

export type RoutineExecutionInput = {
  bullmqJobId?: string | null;
  companyId: string;
  routineId: string;
  source: RoutineRunSource;
  triggerId?: string | null;
};

export type RoutineTriggerJobPayload = {
  companyId: string;
  routineId: string;
  triggerId: string;
};

export type RoutineCronTriggerScheduleRecord = {
  companyId: string;
  cronPattern: string;
  id: string;
  routineId: string;
  timezone: string;
};
