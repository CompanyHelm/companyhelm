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
  taskCategoryId: string | null | undefined;
  taskCategoryName: string | null | undefined;
  updatedAt: string;
};

export type TaskCategoryRecord = {
  id: string;
  name: string;
};

export function formatTaskStatus(status: TaskStatus): string {
  return status === "in_progress"
    ? "In Progress"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatTaskDateTime(value: string | null | undefined, emptyLabel: string): string {
  if (!value) {
    return emptyLabel;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

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
