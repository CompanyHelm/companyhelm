export type TaskStatus = "draft" | "in_progress" | "completed";

export type TaskViewType = "board" | "list";

export type TaskRecord = {
  assignedAt: string | null | undefined;
  assignee: {
    email: string | null | undefined;
    id: string;
    kind: "agent" | "user";
    name: string;
  } | null;
  createdAt: string;
  description: string | null | undefined;
  id: string;
  name: string;
  status: TaskStatus;
  taskStageId: string;
  taskStageName: string;
  updatedAt: string;
};

export type TaskStageRecord = {
  id: string;
  isDefault: boolean;
  name: string;
};

export function formatTaskAssigneeMeta(assignee: TaskRecord["assignee"]): string {
  if (!assignee) {
    return "Unassigned";
  }

  return `${assignee.kind === "agent" ? "Agent" : "User"} • ${assignee.name}`;
}

export function resolveTaskStatusDotClass(status: TaskStatus): string {
  if (status === "completed") {
    return "bg-emerald-500";
  }
  if (status === "in_progress") {
    return "bg-amber-400";
  }

  return "bg-zinc-500";
}
