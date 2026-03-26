import { Suspense, useState } from "react";
import { LayoutGridIcon, PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTaskDialog } from "./create_task_dialog";
import { TaskBoard } from "./task_board";
import type { tasksPageCreateTaskMutation } from "./__generated__/tasksPageCreateTaskMutation.graphql";
import type { tasksPageQuery } from "./__generated__/tasksPageQuery.graphql";
import type { tasksPageSetTaskCategoryMutation } from "./__generated__/tasksPageSetTaskCategoryMutation.graphql";

const tasksPageQueryNode = graphql`
  query tasksPageQuery {
    TaskCategories {
      id
      name
      taskCount
      createdAt
      updatedAt
    }
    Tasks {
      id
      name
      description
      status
      taskCategoryId
      taskCategoryName
      createdAt
      updatedAt
    }
  }
`;

const tasksPageCreateTaskMutationNode = graphql`
  mutation tasksPageCreateTaskMutation($input: CreateTaskInput!) {
    CreateTask(input: $input) {
      id
      name
      description
      status
      taskCategoryId
      taskCategoryName
      createdAt
      updatedAt
    }
  }
`;

const tasksPageSetTaskCategoryMutationNode = graphql`
  mutation tasksPageSetTaskCategoryMutation($input: SetTaskCategoryInput!) {
    SetTaskCategory(input: $input) {
      id
      name
      description
      status
      taskCategoryId
      taskCategoryName
      createdAt
      updatedAt
    }
  }
`;

function filterStoreRecords(records: ReadonlyArray<unknown>): Array<{ getDataID(): string }> {
  return records.filter((record): record is { getDataID(): string } => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

function TasksPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Tasks</CardTitle>
            <CardDescription>
              Capture work, organize it into lanes, and move tasks across the board as plans evolve.
            </CardDescription>
          </div>
          <CardAction>
            <Button disabled size="sm">
              <PlusIcon />
              Create task
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
            Loading tasks...
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function TasksPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const data = useLazyLoadQuery<tasksPageQuery>(
    tasksPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateTask, isCreateTaskInFlight] = useMutation<tasksPageCreateTaskMutation>(
    tasksPageCreateTaskMutationNode,
  );
  const [commitSetTaskCategory] = useMutation<tasksPageSetTaskCategoryMutation>(
    tasksPageSetTaskCategoryMutationNode,
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <LayoutGridIcon className="size-4" />
              Tasks
            </CardTitle>
            <CardDescription>
              Create tasks, sort them into persisted kanban lanes, and drag them across the board as priorities shift.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              onClick={() => {
                setCreateDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              Create task
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <TaskBoard
            categories={data.TaskCategories.map((category) => ({
              id: category.id,
              name: category.name,
            }))}
            tasks={data.Tasks.map((task) => ({
              id: task.id,
              name: task.name,
              description: task.description,
              status: task.status as "draft" | "pending" | "in_progress" | "completed",
              taskCategoryId: task.taskCategoryId,
              taskCategoryName: task.taskCategoryName,
              updatedAt: task.updatedAt,
            }))}
            onMoveTask={async (taskId, taskCategoryId) => {
              setErrorMessage(null);

              await new Promise<void>((resolve, reject) => {
                commitSetTaskCategory({
                  variables: {
                    input: {
                      taskId,
                      taskCategoryId,
                    },
                  },
                  onCompleted: (_response, errors) => {
                    const nextErrorMessage = errors?.[0]?.message;
                    if (nextErrorMessage) {
                      reject(new Error(nextErrorMessage));
                      return;
                    }

                    resolve();
                  },
                  onError: reject,
                });
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to move task.");
              });
            }}
          />
        </CardContent>
      </Card>

      <CreateTaskDialog
        categories={data.TaskCategories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateTaskInFlight}
        onCreate={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitCreateTask({
              variables: {
                input,
              },
              updater: (store) => {
                const createdTask = store.getRootField("CreateTask");
                if (!createdTask) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentTasks = filterStoreRecords(rootRecord.getLinkedRecords("Tasks") || []);
                rootRecord.setLinkedRecords([createdTask, ...currentTasks], "Tasks");
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = errors?.[0]?.message;
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setCreateDialogOpen(false);
                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create task.");
          });
        }}
        onOpenChange={setCreateDialogOpen}
      />
    </main>
  );
}

/**
 * Hosts the Relay-backed task-management slice so the route can stay small while still handling
 * task creation and board moves directly against the GraphQL API.
 */
export function TasksPage() {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <TasksPageContent />
    </Suspense>
  );
}
