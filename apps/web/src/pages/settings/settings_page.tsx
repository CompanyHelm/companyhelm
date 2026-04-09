import { Suspense, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2Icon, PlusIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { TaskCategoryDialog } from "./task_category_dialog";
import type { settingsPageCreateTaskCategoryMutation } from "./__generated__/settingsPageCreateTaskCategoryMutation.graphql";
import type { settingsPageDeleteTaskCategoryMutation } from "./__generated__/settingsPageDeleteTaskCategoryMutation.graphql";
import type { settingsPageQuery } from "./__generated__/settingsPageQuery.graphql";
import type { settingsPageUpdateCompanySettingsMutation } from "./__generated__/settingsPageUpdateCompanySettingsMutation.graphql";

type SettingsPageSearch = {
  tab?: "tasks" | "AI";
};

const settingsPageQueryNode = graphql`
  query settingsPageQuery {
    CompanySettings {
      companyId
      baseSystemPrompt
    }
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

const settingsPageDeleteTaskCategoryMutationNode = graphql`
  mutation settingsPageDeleteTaskCategoryMutation($input: DeleteTaskCategoryInput!) {
    DeleteTaskCategory(input: $input) {
      id
      name
      taskCount
      createdAt
      updatedAt
    }
  }
`;

const settingsPageUpdateCompanySettingsMutationNode = graphql`
  mutation settingsPageUpdateCompanySettingsMutation($input: UpdateCompanySettingsInput!) {
    UpdateCompanySettings(input: $input) {
      companyId
      baseSystemPrompt
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
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings2Icon className="size-4" />
            <span>Settings</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Loading task and agent AI settings...
          </p>
        </div>
        <div className="border-b border-border/60" />
      </div>

      <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
        Loading settings...
      </div>
    </main>
  );
}

function SettingsPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const search = useSearch({ strict: false }) as SettingsPageSearch;
  const [taskErrorMessage, setTaskErrorMessage] = useState<string | null>(null);
  const [isTaskCategoryDialogOpen, setTaskCategoryDialogOpen] = useState(false);
  const [deletingTaskCategoryId, setDeletingTaskCategoryId] = useState<string | null>(null);
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
  const [commitDeleteTaskCategory] = useMutation<settingsPageDeleteTaskCategoryMutation>(
    settingsPageDeleteTaskCategoryMutationNode,
  );
  const [commitUpdateCompanySettings] = useMutation<settingsPageUpdateCompanySettingsMutation>(
    settingsPageUpdateCompanySettingsMutationNode,
  );
  const selectedTab = search.tab === "AI" ? "AI" : "tasks";

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings2Icon className="size-4" />
            <span>Settings</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage task lanes and the company-wide prompt inherited by all agent sessions.
          </p>
        </div>

        <div className="border-b border-border/60">
          <div className="flex items-center gap-6 overflow-x-auto">
            {[
              {
                key: "tasks" as const,
                label: "Tasks",
              },
              {
                key: "AI" as const,
                label: "Agents / AI",
              },
            ].map((tab) => {
              const isSelected = selectedTab === tab.key;

              return (
                <button
                  key={tab.key}
                  className={`-mb-px shrink-0 border-b-2 px-0 py-3 text-sm font-medium transition ${
                    isSelected
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                  onClick={() => {
                    void navigate({
                      params: {
                        organizationSlug,
                      },
                      search: {
                        tab: tab.key,
                      },
                      to: OrganizationPath.route("/settings"),
                    });
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTab === "tasks" ? (
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Task Categories</CardTitle>
              <CardDescription>
                Categories appear as dedicated lanes on the tasks board and stay available for all
                future tasks.
              </CardDescription>
            </div>
            <CardAction>
              <Button
                onClick={() => {
                  setTaskErrorMessage(null);
                  setTaskCategoryDialogOpen(true);
                }}
                size="sm"
              >
                <PlusIcon />
                Add category
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            {taskErrorMessage ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {taskErrorMessage}
              </div>
            ) : null}

            {data.TaskCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No categories yet</p>
                <p className="mt-2 text-xs/relaxed text-muted-foreground">
                  Create your first lane here, or keep using the built-in uncategorized column on
                  the tasks page.
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
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                    Added {new Date(category.createdAt).toLocaleDateString()}
                  </p>
                  <Button
                    aria-label={`Delete ${category.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deletingTaskCategoryId === category.id}
                    onClick={() => {
                      setTaskErrorMessage(null);
                      setDeletingTaskCategoryId(category.id);

                      void new Promise<void>((resolve, reject) => {
                        commitDeleteTaskCategory({
                          variables: {
                            input: {
                              id: category.id,
                            },
                          },
                          updater: (store) => {
                            const deletedCategory = store.getRootField("DeleteTaskCategory");
                            if (!deletedCategory) {
                              return;
                            }

                            const rootRecord = store.getRoot();
                            const currentCategories = filterStoreRecords(rootRecord.getLinkedRecords("TaskCategories") || []);
                            rootRecord.setLinkedRecords(
                              currentCategories.filter((record) => record.getDataID() !== deletedCategory.getDataID()),
                              "TaskCategories",
                            );
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
                        setTaskErrorMessage(error instanceof Error ? error.message : "Failed to delete task category.");
                      }).finally(() => {
                        setDeletingTaskCategoryId((currentCategoryId) => {
                          return currentCategoryId === category.id ? null : currentCategoryId;
                        });
                      });
                    }}
                    size="icon-sm"
                    title={`Delete ${category.name}`}
                    type="button"
                    variant="ghost"
                  >
                    {deletingTaskCategoryId === category.id
                      ? <Loader2Icon className="size-4 animate-spin" />
                      : <Trash2Icon className="size-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {selectedTab === "AI" ? (
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Agents / AI</CardTitle>
              <CardDescription>
                Configure the company-wide prompt layer that is appended after the static
                CompanyHelm system prompt and before each agent prompt override.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <EditableField
              emptyValueLabel="No company base prompt configured"
              fieldType="textarea"
              label="Company base prompt"
              onSave={async (value) => {
                await new Promise<void>((resolve, reject) => {
                  commitUpdateCompanySettings({
                    variables: {
                      input: {
                        baseSystemPrompt: value.length === 0 ? null : value,
                      },
                    },
                    updater: (store) => {
                      const updatedSettings = store.getRootField("UpdateCompanySettings");
                      if (!updatedSettings) {
                        return;
                      }

                      store.getRoot().setLinkedRecord(updatedSettings, "CompanySettings");
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
                });
              }}
              value={data.CompanySettings.baseSystemPrompt}
            />

            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Prompt order
              </p>
              <p className="mt-3 text-sm text-foreground">Static CompanyHelm prompt</p>
              <p className="text-sm text-foreground">Company base prompt</p>
              <p className="text-sm text-foreground">Agent prompt override</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <TaskCategoryDialog
        errorMessage={isTaskCategoryDialogOpen ? taskErrorMessage : null}
        isOpen={isTaskCategoryDialogOpen}
        isSaving={isCreateTaskCategoryInFlight}
        onCreate={async (name) => {
          setTaskErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitCreateTaskCategory({
              variables: {
                input: {
                  name,
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

                resolve();
              },
              onError: reject,
            });
          }).then(() => {
            setTaskCategoryDialogOpen(false);
          }).catch((error: unknown) => {
            setTaskErrorMessage(error instanceof Error ? error.message : "Failed to create task category.");
          });
        }}
        onOpenChange={setTaskCategoryDialogOpen}
      />
    </main>
  );
}

/**
 * Hosts the company settings surface for task categories and shared agent AI configuration.
 */
export function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
