export type WorkflowInputRecord = {
  createdAt?: string;
  defaultValue: string;
  description: string;
  id: string;
  isRequired: boolean;
  name: string;
};

export type WorkflowStepRecord = {
  createdAt?: string;
  id: string;
  instructions: string;
  name: string;
  ordinal?: number;
  stepId?: string;
};

export type WorkflowTriggerInputValueRecord = {
  id: string;
  name: string;
  value: string;
};

export type WorkflowCronTriggerRecord = {
  agentId: string;
  agentName: string;
  createdAt: string;
  cronPattern: string;
  enabled: boolean;
  id: string;
  inputValues: WorkflowTriggerInputValueRecord[];
  overlapPolicy: string;
  timezone: string;
  type: string;
  updatedAt: string;
  workflowDefinitionId: string;
};

export type WorkflowRecord = {
  createdAt: string;
  description: string;
  id: string;
  inputs: WorkflowInputRecord[];
  instructions: string;
  isEnabled: boolean;
  name: string;
  steps: WorkflowStepRecord[];
  triggers: WorkflowCronTriggerRecord[];
  updatedAt: string;
};

export type WorkflowRunStepRecord = {
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
  status: "done" | "pending" | "running";
  workflowRunId: string;
};
