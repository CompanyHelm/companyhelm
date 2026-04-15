import { Suspense, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2Icon, PlusIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { TaskStageDialog } from "./task_stage_dialog";
import type { settingsPageCreateTaskStageMutation } from "./__generated__/settingsPageCreateTaskStageMutation.graphql";
import type { settingsPageDeleteTaskStageMutation } from "./__generated__/settingsPageDeleteTaskStageMutation.graphql";
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
    TaskStages {
      id
      name
      taskCount
      createdAt
      updatedAt
    }
  }
`;

const settingsPageCreateTaskStageMutationNode = graphql`
  mutation settingsPageCreateTaskStageMutation($input: CreateTaskStageInput!) {
    CreateTaskStage(input: $input) {
      id
      name
      taskCount
      createdAt
      updatedAt
    }
  }
`;

const settingsPageDeleteTaskStageMutationNode = graphql`
  mutation settingsPageDeleteTaskStageMutation($input: DeleteTaskStageInput!) {
    DeleteTaskStage(input: $input) {
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
  const [isTaskStageDialogOpen, setTaskStageDialogOpen] = useState(false);
  const [deletingTaskStageId, setDeletingTaskStageId] = useState<string | null>(null);
  const data = useLazyLoadQuery<settingsPageQuery>(
    settingsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateTaskStage, isCreateTaskStageInFlight] = useMutation<settingsPageCreateTaskStageMutation>(
    settingsPageCreateTaskStageMutationNode,
  );
  const [commitDeleteTaskStage] = useMutation<settingsPageDeleteTaskStageMutation>(
    settingsPageDeleteTaskStageMutationNode,
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

        <PageTabs
          items={[
            {
              key: "tasks" as const,
              label: "Tasks",
            },
            {
              key: "AI" as const,
              label: "Agents / AI",
            },
          ]}
          onSelect={(tab) => {
            void navigate({
              params: {
                organizationSlug,
              },
              search: {
                tab,
              },
              to: OrganizationPath.route("/settings"),
            });
          }}
          selectedKey={selectedTab}
        />
      </div>

      {selectedTab === "tasks" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Task Stages</CardTitle>
              <CardDescription>
                Stages appear as dedicated lanes on the tasks board and stay available for all
                future tasks.
              </CardDescription>
            </div>
            <CardAction>
              <Button
                onClick={() => {
                  setTaskErrorMessage(null);
                  setTaskStageDialogOpen(true);
                }}
                size="sm"
              >
                <PlusIcon />
                Add stage
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            {taskErrorMessage ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {taskErrorMessage}
              </div>
            ) : null}

            {data.TaskStages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No stages yet</p>
                <p className="mt-2 text-xs/relaxed text-muted-foreground">
                  Create your first stage here, or keep using the built-in no-stage column on the
                  tasks page.
                </p>
              </div>
            ) : null}

            {data.TaskStages.map((stage) => (
              <div
                key={stage.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/90 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{stage.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stage.taskCount} {stage.taskCount === 1 ? "task" : "tasks"} in this lane
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                    Added {new Date(stage.createdAt).toLocaleDateString()}
                  </p>
                  <Button
                    aria-label={`Delete ${stage.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deletingTaskStageId === stage.id}
                    onClick={() => {
                      setTaskErrorMessage(null);
                      setDeletingTaskStageId(stage.id);

                      void new Promise<void>((resolve, reject) => {
                        commitDeleteTaskStage({
                          variables: {
                            input: {
                              id: stage.id,
                            },
                          },
                          updater: (store) => {
                            const deletedStage = store.getRootField("DeleteTaskStage");
                            if (!deletedStage) {
                              return;
                            }

                            const rootRecord = store.getRoot();
                            const currentStages = filterStoreRecords(rootRecord.getLinkedRecords("TaskStages") || []);
                            rootRecord.setLinkedRecords(
                              currentStages.filter((record) => record.getDataID() !== deletedStage.getDataID()),
                              "TaskStages",
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
                        setTaskErrorMessage(error instanceof Error ? error.message : "Failed to delete task stage.");
                      }).finally(() => {
                        setDeletingTaskStageId((currentStageId) => {
                          return currentStageId === stage.id ? null : currentStageId;
                        });
                      });
                    }}
                    size="icon-sm"
                    title={`Delete ${stage.name}`}
                    type="button"
                    variant="ghost"
                  >
                    {deletingTaskStageId === stage.id
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
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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
              value={data.CompanySettings.baseSystemPrompt ?? null}
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

      <TaskStageDialog
        errorMessage={isTaskStageDialogOpen ? taskErrorMessage : null}
        isOpen={isTaskStageDialogOpen}
        isSaving={isCreateTaskStageInFlight}
        onCreate={async (name) => {
          setTaskErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitCreateTaskStage({
              variables: {
                input: {
                  name,
                },
              },
              updater: (store) => {
                const createdStage = store.getRootField("CreateTaskStage");
                if (!createdStage) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentStages = filterStoreRecords(rootRecord.getLinkedRecords("TaskStages") || []);
                rootRecord.setLinkedRecords([...currentStages, createdStage], "TaskStages");
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
            setTaskStageDialogOpen(false);
          }).catch((error: unknown) => {
            setTaskErrorMessage(error instanceof Error ? error.message : "Failed to create task stage.");
          });
        }}
        onOpenChange={setTaskStageDialogOpen}
      />
    </main>
  );
}

/**
 * Hosts the company settings surface for task stages and shared agent AI configuration.
 */
export function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
