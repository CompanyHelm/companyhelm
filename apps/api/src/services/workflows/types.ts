export type WorkflowDefinitionInputRecord = {
  createdAt: Date;
  defaultValue: string | null;
  description: string | null;
  id: string;
  isRequired: boolean;
  name: string;
  workflowDefinitionId: string;
};

export type WorkflowStepDefinitionRecord = {
  createdAt: Date;
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
  stepId: string;
  workflowDefinitionId: string;
};

export type WorkflowRecord = {
  createdAt: Date;
  description: string | null;
  id: string;
  inputs: WorkflowDefinitionInputRecord[];
  instructions: string | null;
  isEnabled: boolean;
  name: string;
  steps: WorkflowStepDefinitionRecord[];
  updatedAt: Date;
};

export type WorkflowInputDraft = {
  defaultValue?: string | null;
  description?: string | null;
  isRequired?: boolean | null;
  name: string;
};

export type WorkflowStepDraft = {
  instructions?: string | null;
  name: string;
};

export type WorkflowCreateInput = {
  companyId: string;
  createdByUserId?: string | null;
  description?: string | null;
  inputs: WorkflowInputDraft[];
  instructions?: string | null;
  isEnabled?: boolean | null;
  name: string;
  steps: WorkflowStepDraft[];
};

export type WorkflowUpdateInput = {
  companyId: string;
  description?: string | null;
  inputs?: WorkflowInputDraft[] | null;
  instructions?: string | null;
  isEnabled?: boolean | null;
  name?: string | null;
  steps?: WorkflowStepDraft[] | null;
  workflowDefinitionId: string;
};

export type WorkflowRunInputValue = {
  name: string;
  value: string;
};

export type WorkflowRunStatus = "running" | "done" | "canceled";

export type WorkflowRunStepStatus = "pending" | "running" | "done";

export type WorkflowRunStepRecord = {
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
  status: WorkflowRunStepStatus;
  workflowRunId: string;
};

export type WorkflowRunRecord = {
  agentId: string;
  completedAt: Date | null;
  createdAt: Date;
  id: string;
  instructions: string | null;
  sessionId: string;
  startedAt: Date | null;
  status: WorkflowRunStatus;
  steps: WorkflowRunStepRecord[];
  updatedAt: Date;
  workflowDefinitionId: string | null;
};

export type WorkflowRunCreateInput = {
  agentId: string;
  companyId: string;
  inputValues: WorkflowRunInputValue[];
  startedByUserId?: string | null;
  workflowDefinitionId: string;
};
