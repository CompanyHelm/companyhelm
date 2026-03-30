import { Suspense, useMemo } from "react";
import { useOrganization } from "@clerk/react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { AgentsSection, type DashboardAgentRecord } from "./agents_section";
import { CredentialsSection, type DashboardCredentialRecord } from "./credentials_section";
import { EnvironmentsSection, type DashboardEnvironmentRecord } from "./environments_section";
import {
  RepositoriesSection,
  type DashboardInstallationRecord,
  type DashboardRepositoryRecord,
} from "./repositories_section";
import { SessionsSection, type DashboardSessionRecord } from "./sessions_section";
import type { dashboardPageQuery } from "./__generated__/dashboardPageQuery.graphql";

const dashboardPageQueryNode = graphql`
  query dashboardPageQuery {
    Me {
      company {
        id
        name
      }
    }
    Agents {
      id
      name
      modelProvider
      modelName
      reasoningLevel
      updatedAt
    }
    Sessions {
      id
      agentId
      inferredTitle
      status
      updatedAt
      userSetTitle
    }
    GithubInstallations {
      id
      installationId
      createdAt
    }
    GithubRepositories {
      id
      githubInstallationId
      name
      fullName
      htmlUrl
      isPrivate
      defaultBranch
      archived
      updatedAt
    }
    Environments {
      id
      agentId
      agentName
      displayName
      provider
      providerEnvironmentId
      status
      updatedAt
    }
    ModelProviderCredentials {
      id
      name
      modelProvider
      type
      updatedAt
    }
  }
`;

function DashboardPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted/40" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading agents and sessions…
        </div>
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading repositories…
        </div>
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading environments…
        </div>
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading credentials…
        </div>
      </div>
    </main>
  );
}

function DashboardPageContent() {
  const organizationState = useOrganization();
  const data = useLazyLoadQuery<dashboardPageQuery>(
    dashboardPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );

  const agentNameById = useMemo(() => {
    return new Map(data.Agents.map((agent) => [agent.id, agent.name]));
  }, [data.Agents]);

  const sessionsByAgentId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of data.Sessions) {
      counts.set(session.agentId, (counts.get(session.agentId) ?? 0) + 1);
    }
    return counts;
  }, [data.Sessions]);

  const agents = useMemo<DashboardAgentRecord[]>(() => {
    return [...data.Agents]
      .map((agent) => ({
        id: agent.id,
        modelName: agent.modelName,
        modelProvider: agent.modelProvider,
        name: agent.name,
        reasoningLevel: agent.reasoningLevel,
        sessionCount: sessionsByAgentId.get(agent.id) ?? 0,
        updatedAt: agent.updatedAt,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [data.Agents, sessionsByAgentId]);

  const sessions = useMemo<DashboardSessionRecord[]>(() => {
    return [...data.Sessions]
      .map((session) => ({
        agentId: session.agentId,
        agentName: agentNameById.get(session.agentId) ?? "Unknown agent",
        id: session.id,
        inferredTitle: session.inferredTitle,
        status: session.status,
        updatedAt: session.updatedAt,
        userSetTitle: session.userSetTitle,
      }))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [agentNameById, data.Sessions]);

  const installations = useMemo<DashboardInstallationRecord[]>(() => {
    return [...data.GithubInstallations]
      .map((installation) => ({
        createdAt: installation.createdAt,
        id: installation.id,
        installationId: installation.installationId,
      }))
      .sort((left, right) => left.installationId.localeCompare(right.installationId));
  }, [data.GithubInstallations]);

  const repositories = useMemo<DashboardRepositoryRecord[]>(() => {
    return [...data.GithubRepositories]
      .map((repository) => ({
        archived: repository.archived,
        defaultBranch: repository.defaultBranch,
        fullName: repository.fullName,
        githubInstallationId: repository.githubInstallationId,
        htmlUrl: repository.htmlUrl,
        id: repository.id,
        isPrivate: repository.isPrivate,
        name: repository.name,
        updatedAt: repository.updatedAt,
      }))
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }, [data.GithubRepositories]);

  const environments = useMemo<DashboardEnvironmentRecord[]>(() => {
    return [...data.Environments]
      .map((environment) => ({
        agentName: environment.agentName,
        displayName: environment.displayName,
        id: environment.id,
        provider: environment.provider,
        providerEnvironmentId: environment.providerEnvironmentId,
        status: environment.status,
        updatedAt: environment.updatedAt,
      }))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [data.Environments]);

  const credentials = useMemo<DashboardCredentialRecord[]>(() => {
    return [...data.ModelProviderCredentials]
      .map((credential) => ({
        id: credential.id,
        modelProvider: credential.modelProvider,
        name: credential.name,
        type: credential.type,
        updatedAt: credential.updatedAt,
      }))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [data.ModelProviderCredentials]);
  const organizationName = organizationState.organization?.name || data.Me.company.name;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
          {organizationName}
        </h1>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <AgentsSection agents={agents} />
        <SessionsSection sessions={sessions} />
      </div>

      <RepositoriesSection
        installations={installations}
        repositories={repositories}
      />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <EnvironmentsSection environments={environments} />
        <CredentialsSection credentials={credentials} />
      </div>
    </main>
  );
}

export function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <DashboardPageContent />
    </Suspense>
  );
}
