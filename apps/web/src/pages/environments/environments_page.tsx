import { Suspense, useState } from "react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { EnvironmentsTable, type EnvironmentsTableRecord } from "./environments_table";
import type { environmentsPageDeleteEnvironmentMutation } from "./__generated__/environmentsPageDeleteEnvironmentMutation.graphql";
import type { environmentsPageStartEnvironmentMutation } from "./__generated__/environmentsPageStartEnvironmentMutation.graphql";
import type { environmentsPageStopEnvironmentMutation } from "./__generated__/environmentsPageStopEnvironmentMutation.graphql";
import type { environmentsPageQuery } from "./__generated__/environmentsPageQuery.graphql";

const environmentsPageQueryNode = graphql`
  query environmentsPageQuery {
    Environments {
      id
      agentId
      agentName
      provider
      providerEnvironmentId
      displayName
      platform
      status
      cpuCount
      memoryGb
      diskSpaceGb
      lastSeenAt
      updatedAt
    }
  }
`;

const environmentsPageDeleteEnvironmentMutationNode = graphql`
  mutation environmentsPageDeleteEnvironmentMutation($input: DeleteEnvironmentInput!) {
    DeleteEnvironment(input: $input) {
      id
    }
  }
`;

const environmentsPageStartEnvironmentMutationNode = graphql`
  mutation environmentsPageStartEnvironmentMutation($input: StartEnvironmentInput!) {
    StartEnvironment(input: $input) {
      id
      status
    }
  }
`;

const environmentsPageStopEnvironmentMutationNode = graphql`
  mutation environmentsPageStopEnvironmentMutation($input: StopEnvironmentInput!) {
    StopEnvironment(input: $input) {
      id
      status
    }
  }
`;

function EnvironmentsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>
            Review the current agent environments provisioned for this workspace in a single table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnvironmentsTable
            actingEnvironmentId={null}
            deletingEnvironmentId={null}
            environments={[]}
            isLoading
            onDelete={async () => undefined}
            onStart={async () => undefined}
            onStop={async () => undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function EnvironmentsPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actingEnvironmentId, setActingEnvironmentId] = useState<string | null>(null);
  const [deletingEnvironmentId, setDeletingEnvironmentId] = useState<string | null>(null);
  const data = useLazyLoadQuery<environmentsPageQuery>(
    environmentsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitDeleteEnvironment, isDeleteEnvironmentInFlight] = useMutation<environmentsPageDeleteEnvironmentMutation>(
    environmentsPageDeleteEnvironmentMutationNode,
  );
  const [commitStartEnvironment, isStartEnvironmentInFlight] = useMutation<environmentsPageStartEnvironmentMutation>(
    environmentsPageStartEnvironmentMutationNode,
  );
  const [commitStopEnvironment, isStopEnvironmentInFlight] = useMutation<environmentsPageStopEnvironmentMutation>(
    environmentsPageStopEnvironmentMutationNode,
  );
  const environments: EnvironmentsTableRecord[] = data.Environments.map((environment) => ({
    agentId: environment.agentId,
    agentName: environment.agentName,
    cpuCount: environment.cpuCount,
    diskSpaceGb: environment.diskSpaceGb,
    displayName: environment.displayName,
    id: environment.id,
    lastSeenAt: environment.lastSeenAt,
    memoryGb: environment.memoryGb,
    platform: environment.platform,
    provider: environment.provider,
    providerEnvironmentId: environment.providerEnvironmentId,
    status: environment.status,
    updatedAt: environment.updatedAt,
  }));
  const filterStoreRecords = (
    records: ReadonlyArray<unknown>,
  ): Array<{ getDataID(): string }> => {
    return records.filter((record): record is { getDataID(): string } => {
      return typeof record === "object"
        && record !== null
        && "getDataID" in record
        && typeof record.getDataID === "function";
    });
  };
  const updateEnvironmentStatusInStore = (
    environmentId: string,
    status: string,
    store: {
      get(dataId: string): {
        setValue(value: string, key: string): void;
      } | null;
    },
  ) => {
    const environmentRecord = store.get(environmentId);
    if (!environmentRecord) {
      return;
    }

    environmentRecord.setValue(status, "status");
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>
            Review the current agent environments provisioned for this workspace in a single table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <EnvironmentsTable
            actingEnvironmentId={actingEnvironmentId}
            deletingEnvironmentId={deletingEnvironmentId}
            environments={environments}
            isLoading={false}
            onDelete={async (environmentId, force) => {
              if (isDeleteEnvironmentInFlight) {
                return;
              }

              setErrorMessage(null);
              setDeletingEnvironmentId(environmentId);

              await new Promise<void>((resolve, reject) => {
                commitDeleteEnvironment({
                  variables: {
                    input: {
                      force,
                      id: environmentId,
                    },
                  },
                  updater: (store) => {
                    const deletedEnvironment = store.getRootField("DeleteEnvironment");
                    if (!deletedEnvironment) {
                      return;
                    }

                    const deletedId = deletedEnvironment.getDataID();
                    const rootRecord = store.getRoot();
                    const currentEnvironments = filterStoreRecords(rootRecord.getLinkedRecords("Environments") || []);
                    rootRecord.setLinkedRecords(
                      currentEnvironments.filter((record) => record.getDataID() !== deletedId),
                      "Environments",
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
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete environment.");
              });

              setDeletingEnvironmentId(null);
            }}
            onStart={async (environmentId) => {
              if (isStartEnvironmentInFlight || isDeleteEnvironmentInFlight || isStopEnvironmentInFlight) {
                return;
              }

              setErrorMessage(null);
              setActingEnvironmentId(environmentId);

              await new Promise<void>((resolve, reject) => {
                commitStartEnvironment({
                  variables: {
                    input: {
                      id: environmentId,
                    },
                  },
                  updater: (store) => {
                    const startedEnvironment = store.getRootField("StartEnvironment");
                    if (!startedEnvironment) {
                      return;
                    }

                    updateEnvironmentStatusInStore(startedEnvironment.getDataID(), "running", store);
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
                setErrorMessage(error instanceof Error ? error.message : "Failed to start environment.");
              });

              setActingEnvironmentId(null);
            }}
            onStop={async (environmentId) => {
              if (isStartEnvironmentInFlight || isDeleteEnvironmentInFlight || isStopEnvironmentInFlight) {
                return;
              }

              setErrorMessage(null);
              setActingEnvironmentId(environmentId);

              await new Promise<void>((resolve, reject) => {
                commitStopEnvironment({
                  variables: {
                    input: {
                      id: environmentId,
                    },
                  },
                  updater: (store) => {
                    const stoppedEnvironment = store.getRootField("StopEnvironment");
                    if (!stoppedEnvironment) {
                      return;
                    }

                    updateEnvironmentStatusInStore(stoppedEnvironment.getDataID(), "stopped", store);
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
                setErrorMessage(error instanceof Error ? error.message : "Failed to stop environment.");
              });

              setActingEnvironmentId(null);
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}

export function EnvironmentsPage() {
  return (
    <Suspense fallback={<EnvironmentsPageFallback />}>
      <EnvironmentsPageContent />
    </Suspense>
  );
}
