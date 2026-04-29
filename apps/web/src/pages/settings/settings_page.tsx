import { Suspense, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Building2Icon, Loader2Icon, PlusIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { OrganizationMembersSettingsPanel } from "@/components/auth/organization_members_settings_panel";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import { ClerkChooseOrganizationTaskUrl } from "@/lib/clerk_choose_organization_task_url";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { SelectedOrganizationStorage } from "@/pages/root/selected_organization_storage";
import { DeleteCompanyDialog } from "./delete_company_dialog";
import { TaskStageDialog } from "./task_stage_dialog";
import type { settingsPageCreateTaskStageMutation } from "./__generated__/settingsPageCreateTaskStageMutation.graphql";
import type { settingsPageDeleteCompanyMutation } from "./__generated__/settingsPageDeleteCompanyMutation.graphql";
import type { settingsPageDeleteTaskStageMutation } from "./__generated__/settingsPageDeleteTaskStageMutation.graphql";
import type { settingsPageQuery } from "./__generated__/settingsPageQuery.graphql";
import type { settingsPageUpdateCompanySettingsMutation } from "./__generated__/settingsPageUpdateCompanySettingsMutation.graphql";

type SettingsPageSearch = {
  tab?: "tasks" | "AI" | "company" | "members";
};

const settingsPageQueryNode = graphql`
  query settingsPageQuery {
    Me {
      companyEntitlements {
        canDeleteCompany
      }
      company {
        id
        name
      }
    }
    CompanySettings {
      companyId
      baseSystemPrompt
    }
    TaskStages {
      id
      name
      isDefault
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
      isDefault
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
      isDefault
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

const settingsPageDeleteCompanyMutationNode = graphql`
  mutation settingsPageDeleteCompanyMutation($input: DeleteCompanyInput!) {
    DeleteCompany(input: $input) {
      id
      companyId
      companyName
      status
      requestedAt
      completedAt
      lastError
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
            Loading task, company, and agent AI settings...
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
  const [companyErrorMessage, setCompanyErrorMessage] = useState<string | null>(null);
  const [deletionRequestStatus, setDeletionRequestStatus] = useState<string | null>(null);
  const [isTaskStageDialogOpen, setTaskStageDialogOpen] = useState(false);
  const [isDeleteCompanyDialogOpen, setDeleteCompanyDialogOpen] = useState(false);
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
  const [commitDeleteCompany, isDeleteCompanyInFlight] = useMutation<settingsPageDeleteCompanyMutation>(
    settingsPageDeleteCompanyMutationNode,
  );
  const selectedTab = search.tab === "AI" || search.tab === "company" || search.tab === "members"
    ? search.tab
    : "tasks";
  const companyName = data.Me.company.name;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings2Icon className="size-4" />
            <span>Settings</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage task lanes, company details, and the prompt inherited by all agent sessions.
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
            {
              key: "company" as const,
              label: "Company",
            },
            {
              key: "members" as const,
              label: "Members",
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
                  Create your first stage here. New companies receive Backlog automatically.
                </p>
              </div>
            ) : null}

            {data.TaskStages.map((stage) => (
              <div
                key={stage.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/90 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{stage.name}</p>
                    {stage.isDefault ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
                        Default
                      </span>
                    ) : null}
                  </div>
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
                    disabled={stage.isDefault || deletingTaskStageId === stage.id}
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

      {selectedTab === "company" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Company</CardTitle>
              <CardDescription>
                Manage the current Clerk organization and CompanyHelm workspace.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/90 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/30 text-muted-foreground">
                  <Building2Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{companyName}</p>
                  <p className="text-xs text-muted-foreground">Current organization</p>
                </div>
              </div>
            </div>

            {deletionRequestStatus ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Company deletion request created. Status: {deletionRequestStatus}
              </div>
            ) : null}

            {companyErrorMessage ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {companyErrorMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Delete company</p>
                <p className="mt-1 text-xs/relaxed text-muted-foreground">
                  Remove the Clerk organization and schedule all CompanyHelm company data for cleanup.
                </p>
              </div>
              <Button
                className="w-full sm:w-auto"
                disabled={deletionRequestStatus !== null || !data.Me.companyEntitlements.canDeleteCompany}
                onClick={() => {
                  setCompanyErrorMessage(null);
                  setDeleteCompanyDialogOpen(true);
                }}
                type="button"
                variant="destructive"
              >
                <Trash2Icon />
                Delete company
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {selectedTab === "members" ? (
        <OrganizationMembersSettingsPanel />
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
      <DeleteCompanyDialog
        companyName={companyName}
        errorMessage={isDeleteCompanyDialogOpen ? companyErrorMessage : null}
        isDeleting={isDeleteCompanyInFlight}
        isOpen={isDeleteCompanyDialogOpen}
        onDelete={async (confirmationName) => {
          setCompanyErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitDeleteCompany({
              variables: {
                input: {
                  confirmationName,
                },
              },
              onCompleted: (response, errors) => {
                const nextErrorMessage = errors?.[0]?.message;
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setDeletionRequestStatus(response.DeleteCompany.status);
                resolve();
              },
              onError: reject,
            });
          }).then(() => {
            setDeleteCompanyDialogOpen(false);
            SelectedOrganizationStorage.clearOrganizationId();
            ClerkChooseOrganizationTaskUrl.redirectCurrentWindow();
          }).catch((error: unknown) => {
            setCompanyErrorMessage(error instanceof Error ? error.message : "Failed to delete company.");
          });
        }}
        onOpenChange={setDeleteCompanyDialogOpen}
      />
    </main>
  );
}

/**
 * Hosts the company settings surface for task stages, company details, and shared agent AI
 * configuration.
 */
export function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
