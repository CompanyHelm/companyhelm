import { Suspense, useState } from "react";
import { PlusIcon, Settings2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { settingsPageCreateTaskCategoryMutation } from "./__generated__/settingsPageCreateTaskCategoryMutation.graphql";
import type { settingsPageQuery } from "./__generated__/settingsPageQuery.graphql";

const settingsPageQueryNode = graphql`
  query settingsPageQuery {
    TaskCategories {
      id
      name
      taskCount
      createdAt
      updatedAt
    }
  }
`;

const settingsPageCreateTaskCategoryMutationNode = graphql`
  mutation settingsPageCreateTaskCategoryMutation($input: CreateTaskCategoryInput!) {
    CreateTaskCategory(input: $input) {
      id
      name
      taskCount
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

function SettingsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Settings</CardTitle>
            <CardDescription>Loading task category settings...</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
            Loading settings...
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function SettingsPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const data = useLazyLoadQuery<settingsPageQuery>(
    settingsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateTaskCategory, isCreateTaskCategoryInFlight] = useMutation<settingsPageCreateTaskCategoryMutation>(
    settingsPageCreateTaskCategoryMutationNode,
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Settings2Icon className="size-4" />
              Settings
            </CardTitle>
            <CardDescription>
              Manage the categories that define the kanban lanes shown on the tasks board.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              disabled={isCreateTaskCategoryInFlight || newCategoryName.length === 0}
              onClick={async () => {
                setErrorMessage(null);

                await new Promise<void>((resolve, reject) => {
                  commitCreateTaskCategory({
                    variables: {
                      input: {
                        name: newCategoryName,
                      },
                    },
                    updater: (store) => {
                      const createdCategory = store.getRootField("CreateTaskCategory");
                      if (!createdCategory) {
                        return;
                      }

                      const rootRecord = store.getRoot();
                      const currentCategories = filterStoreRecords(rootRecord.getLinkedRecords("TaskCategories") || []);
                      rootRecord.setLinkedRecords([...currentCategories, createdCategory], "TaskCategories");
                    },
                    onCompleted: (_response, errors) => {
                      const nextErrorMessage = errors?.[0]?.message;
                      if (nextErrorMessage) {
                        reject(new Error(nextErrorMessage));
                        return;
                      }

                      setNewCategoryName("");
                      resolve();
                    },
                    onError: reject,
                  });
                }).catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : "Failed to create task category.");
                });
              }}
              size="sm"
            >
              <PlusIcon />
              Add lane
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="task-category-name">
              Category name
            </label>
            <Input
              id="task-category-name"
              onChange={(event) => {
                setNewCategoryName(event.target.value);
              }}
              placeholder="Backlog"
              value={newCategoryName}
            />
            <p className="text-xs text-muted-foreground">
              New categories appear as dedicated board lanes immediately after creation.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-3">
            {data.TaskCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No categories yet</p>
                <p className="mt-2 text-xs/relaxed text-muted-foreground">
                  Create your first lane here, or keep using the built-in uncategorized column on the tasks page.
                </p>
              </div>
            ) : null}

            {data.TaskCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/90 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.taskCount} {category.taskCount === 1 ? "task" : "tasks"} in this lane
                  </p>
                </div>
                <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                  Added {new Date(category.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Hosts the minimal settings surface requested for the initial tasks migration: category creation
 * and visibility into how many tasks currently sit in each persisted lane.
 */
export function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
