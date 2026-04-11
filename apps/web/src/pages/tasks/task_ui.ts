export type TaskStatus = "draft" | "in_progress" | "completed";

export type TaskViewType = "board" | "list";

export type TaskRecord = {
  assignedAt: string | null;
  assignee: {
    email: string | null;
    id: string;
    kind: "agent" | "user";
    name: string;
  } | null;
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  status: TaskStatus;
  taskCategoryId: string | null;
  taskCategoryName: string | null;
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

export function resolveTaskStatusVariant(status: TaskStatus): "outline" | "warning" | "positive" {
  if (status === "completed") {
    return "positive";
  }
  if (status === "in_progress") {
    return "warning";
  }

  return "outline";
}

export function formatTaskTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(timestamp);
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
