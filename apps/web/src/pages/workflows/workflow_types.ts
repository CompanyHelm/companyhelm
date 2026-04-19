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

export type WorkflowRecord = {
  createdAt: string;
  description: string;
  id: string;
  inputs: WorkflowInputRecord[];
  instructions: string;
  isEnabled: boolean;
  name: string;
  steps: WorkflowStepRecord[];
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
