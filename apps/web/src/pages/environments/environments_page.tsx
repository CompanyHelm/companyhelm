import { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { EnvironmentsTable, type EnvironmentsTableRecord } from "./environments_table";
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
          <EnvironmentsTable environments={[]} isLoading />
        </CardContent>
      </Card>
    </main>
  );
}

function EnvironmentsPageContent() {
  const data = useLazyLoadQuery<environmentsPageQuery>(
    environmentsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
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

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>
            Review the current agent environments provisioned for this workspace in a single table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnvironmentsTable environments={environments} isLoading={false} />
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
