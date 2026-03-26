import { Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { githubInstallCallbackPageAddGithubInstallationMutation } from "./__generated__/githubInstallCallbackPageAddGithubInstallationMutation.graphql";
import type { githubInstallCallbackPageQuery } from "./__generated__/githubInstallCallbackPageQuery.graphql";

type StoreRecord = {
  getDataID(): string;
  getValue(name: string): unknown;
};

const githubInstallCallbackPageQueryNode = graphql`
  query githubInstallCallbackPageQuery {
    Me {
      company {
        id
      }
    }
  }
`;

const githubInstallCallbackPageAddGithubInstallationMutationNode = graphql`
  mutation githubInstallCallbackPageAddGithubInstallationMutation($input: AddGithubInstallationInput!) {
    AddGithubInstallation(input: $input) {
      githubInstallation {
        id
        installationId
        createdAt
      }
      repositories {
        id
        githubInstallationId
        externalId
        name
        fullName
        htmlUrl
        isPrivate
        defaultBranch
        archived
        createdAt
        updatedAt
      }
    }
  }
`;

function filterStoreRecords(records: ReadonlyArray<unknown>): StoreRecord[] {
  return records.filter((record): record is StoreRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function";
  });
}

function GithubInstallCallbackPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Connecting GitHub installation</CardTitle>
          <CardDescription>Processing the GitHub install callback.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading callback context…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function GithubInstallCallbackPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const callbackHandledRef = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const data = useLazyLoadQuery<githubInstallCallbackPageQuery>(
    githubInstallCallbackPageQueryNode,
    {},
    {
      fetchPolicy: "store-or-network",
    },
  );
  const [commitAddInstallation] =
    useMutation<githubInstallCallbackPageAddGithubInstallationMutation>(
      githubInstallCallbackPageAddGithubInstallationMutationNode,
    );

  useEffect(() => {
    const callbackInstallationId = search.installation_id || "";
    const callbackSetupAction = search.setup_action || "";
    const callbackState = search.state || "";
    const callbackKey = [callbackInstallationId, callbackSetupAction, callbackState].join("|");

    if (!callbackKey.replace(/\|/g, "")) {
      setErrorMessage("GitHub install callback is missing installation details.");
      return;
    }
    if (callbackHandledRef.current === callbackKey) {
      return;
    }

    callbackHandledRef.current = callbackKey;

    if (!callbackInstallationId) {
      setErrorMessage("GitHub install callback is missing installation_id.");
      return;
    }
    if (callbackState && callbackState !== data.Me.company.id) {
      setErrorMessage(`GitHub callback belongs to company ${callbackState}, not the current company.`);
      return;
    }

    let isCancelled = false;
    setErrorMessage(null);

    const updateRepositoriesStore = (
      store: {
        getRoot(): {
          getLinkedRecords(name: string): ReadonlyArray<unknown> | null;
          setLinkedRecords(records: ReadonlyArray<unknown>, name: string): void;
        };
        getRootField(name: string): {
          getLinkedRecord(name: string): StoreRecord | null;
          getLinkedRecords(name: string): ReadonlyArray<unknown> | null;
          getValue(name: string): unknown;
        } | null;
      },
    ) => {
      const payload = store.getRootField("AddGithubInstallation");
      const newInstallation = payload?.getLinkedRecord("githubInstallation");
      if (!newInstallation) {
        return;
      }

      const rootRecord = store.getRoot();
      const currentInstallations = filterStoreRecords(rootRecord.getLinkedRecords("GithubInstallations") || []);
      const nextInstallations = [
        newInstallation,
        ...currentInstallations.filter((installation) => {
          return String(installation.getValue("installationId") || "")
            !== String(newInstallation.getValue("installationId") || "");
        }),
      ];
      rootRecord.setLinkedRecords(nextInstallations, "GithubInstallations");

      const installationId = String(newInstallation.getValue("installationId") || "");
      const newRepositories = filterStoreRecords(payload?.getLinkedRecords("repositories") || []);
      const currentRepositories = filterStoreRecords(rootRecord.getLinkedRecords("GithubRepositories") || []);
      const preservedRepositories = currentRepositories.filter((repository) => {
        return String(repository.getValue("githubInstallationId") || "") !== installationId;
      });
      rootRecord.setLinkedRecords(
        [...preservedRepositories, ...newRepositories],
        "GithubRepositories",
      );
    };

    void new Promise<void>((resolve, reject) => {
      commitAddInstallation({
        variables: {
          input: {
            installationId: callbackInstallationId,
            setupAction: callbackSetupAction || null,
          },
        },
        updater: updateRepositoriesStore,
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    })
      .then(async () => {
        if (isCancelled) {
          return;
        }

        await navigate({
          to: "/repositories",
          replace: true,
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Failed to link GitHub installation.");
      });

    return () => {
      isCancelled = true;
    };
  }, [commitAddInstallation, data.Me.company.id, navigate, search.installation_id, search.setup_action, search.state]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Connecting GitHub installation</CardTitle>
          <CardDescription>
            Installing the GitHub App for this company and syncing its repositories.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage ? (
            <>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
              <div>
                <Button render={<Link to="/repositories" />} size="sm" variant="outline">
                  Back to repositories
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              <span>Linking the installation and refreshing repositories…</span>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function GithubInstallCallbackPage() {
  return (
    <Suspense fallback={<GithubInstallCallbackPageFallback />}>
      <GithubInstallCallbackPageContent />
    </Suspense>
  );
}
