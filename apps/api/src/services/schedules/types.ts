export type ScheduleType = "workflow" | "queued_agent_message";

export type ScheduleRunStatus = "running" | "done" | "skipped" | "failed";

export type ScheduleJobPayload = {
  companyId: string;
  scheduleId: string;
  scheduleType: ScheduleType;
};

export type CronScheduleQueueRecord = {
  companyId: string;
  cronPattern: string;
  scheduleId: string;
  scheduleType: ScheduleType;
  timezone: string;
};

export type ScheduleRunRecord = {
  bullmqJobId: string | null;
  companyId: string;
  completedAt: Date | null;
  createdAt: Date;
  errorMessage: string | null;
  id: string;
  queuedMessageId: string | null;
  scheduleId: string;
  sessionId: string | null;
  skippedReason: string | null;
  startedAt: Date;
  status: ScheduleRunStatus;
  updatedAt: Date;
  workflowRunId: string | null;
};
