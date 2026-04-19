export type WorkflowInputRecord = {
  defaultValue: string;
  description: string;
  id: string;
  isRequired: boolean;
  name: string;
};

export type WorkflowStepRecord = {
  id: string;
  instructions: string;
  name: string;
};

export type WorkflowRecord = {
  createdAt: string;
  description: string;
  id: string;
  inputs: WorkflowInputRecord[];
  instructions: string;
  name: string;
  steps: WorkflowStepRecord[];
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function readInput(value: unknown): WorkflowInputRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const name = readString(value.name);
  if (id.length === 0 || name.length === 0) {
    return null;
  }

  return {
    defaultValue: readString(value.defaultValue),
    description: readString(value.description),
    id,
    isRequired: readBoolean(value.isRequired),
    name,
  };
}

function readStep(value: unknown): WorkflowStepRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const name = readString(value.name);
  if (id.length === 0 || name.length === 0) {
    return null;
  }

  return {
    id,
    instructions: readString(value.instructions),
    name,
  };
}

function readWorkflow(value: unknown): WorkflowRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const name = readString(value.name);
  if (id.length === 0 || name.length === 0) {
    return null;
  }

  const inputs = Array.isArray(value.inputs)
    ? value.inputs.map(readInput).filter((input): input is WorkflowInputRecord => input !== null)
    : [];
  const steps = Array.isArray(value.steps)
    ? value.steps.map(readStep).filter((step): step is WorkflowStepRecord => step !== null)
    : [];

  return {
    createdAt: readString(value.createdAt) || new Date().toISOString(),
    description: readString(value.description),
    id,
    inputs,
    instructions: readString(value.instructions),
    name,
    steps,
    updatedAt: readString(value.updatedAt) || new Date().toISOString(),
  };
}

/**
 * Keeps the management UI usable before workflow GraphQL operations exist. The stored shape mirrors
 * the durable workflow records so backend persistence can replace this module without changing the UI.
 */
export class WorkflowStorage {
  public constructor(private readonly storageKey: string) {}

  public read(): WorkflowRecord[] {
    const rawValue = window.localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map(readWorkflow).filter((workflow): workflow is WorkflowRecord => workflow !== null);
  }

  public write(workflows: WorkflowRecord[]): void {
    window.localStorage.setItem(this.storageKey, JSON.stringify(workflows));
  }
}
