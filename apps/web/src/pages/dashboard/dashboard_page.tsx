import { Suspense, useMemo } from "react";
import { useOrganization } from "@/components/auth/auth_provider";
import { useMeCompany } from "@/contextes/me_context";
import { UsageMetrics } from "@/lib/usage_metrics";
import { graphql, useLazyLoadQuery } from "react-relay";
import { EnvironmentsSection, type DashboardEnvironmentRecord } from "./environments_section";
import { TasksSection, type DashboardTaskRecord, type DashboardWindowStat } from "./tasks_section";
import { UsageSection } from "./usage_section";
import { WorkflowRunsSection, type DashboardWorkflowRunRecord } from "./workflow_runs_section";
import type { dashboardPageQuery } from "./__generated__/dashboardPageQuery.graphql";

const DASHBOARD_SECTION_LIMIT = 5;
const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
const thirtyDaysInMilliseconds = 30 * oneDayInMilliseconds;

const dashboardPageQueryNode = graphql`
  query dashboardPageQuery($dailyStart: String!, $monthlyStart: String!) {
    Agents {
      id
      name
    }
    Tasks {
      id
      name
      status
      taskStageName
      completedAt
      updatedAt
      assignee {
        id
        name
      }
    }
    Workflows {
      id
      name
      isEnabled
    }
    WorkflowRuns {
      id
      workflowDefinitionId
      status
      agentId
      sessionId
      source
      startedAt
      completedAt
      updatedAt
      steps {
        id
        workflowRunId
        name
        ordinal
        status
      }
    }
    Environments {
      id
      agentName
      displayName
      provider
      providerEnvironmentId
      status
      updatedAt
    }
    companyTotal: LlmUsageAggregates(input: { scopeType: company, period: total }) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    companyDaily: LlmUsageAggregates(input: { scopeType: company, period: day, periodStartAfter: $dailyStart }) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    companyMonthly: LlmUsageAggregates(input: { scopeType: company, period: month, periodStartAfter: $monthlyStart }) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
  }
`;

function DashboardPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="h-8 w-72 animate-pulse rounded-md bg-muted/40" />
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-16 text-center text-sm text-muted-foreground">
        Loading usage and operational activity…
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
          Loading running work…
        </div>
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
          Loading completed work…
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-16 text-center text-sm text-muted-foreground">
        Loading environments…
      </div>
    </main>
  );
}

function DashboardPageContent() {
  const organizationState = useOrganization();
  const meCompany = useMeCompany();
  const data = useLazyLoadQuery<dashboardPageQuery>(
    dashboardPageQueryNode,
    {
      dailyStart: UsageMetrics.resolveUtcDayStart(29),
      monthlyStart: UsageMetrics.resolveUtcMonthStart(11),
    },
    {
      fetchPolicy: "store-and-network",
    },
  );

  const workflowNameById = useMemo(() => {
    return new Map(data.Workflows.map((workflow) => [workflow.id, workflow.name]));
  }, [data.Workflows]);

  const agentNameById = useMemo(() => {
    return new Map(data.Agents.map((agent) => [agent.id, agent.name]));
  }, [data.Agents]);

  const tasks = useMemo<DashboardTaskRecord[]>(() => {
    return data.Tasks.map((task) => ({
      assigneeName: task.assignee?.name ?? "Unassigned",
      completedAt: task.completedAt ?? null,
      id: task.id,
      name: task.name,
      status: task.status,
      taskStageName: task.taskStageName,
      updatedAt: task.updatedAt,
    }));
  }, [data.Tasks]);

  const workflowRuns = useMemo<DashboardWorkflowRunRecord[]>(() => {
    return data.WorkflowRuns.map((run) => ({
      agentName: agentNameById.get(run.agentId) ?? "Unknown agent",
      completedAt: run.completedAt ?? null,
      id: run.id,
      sessionId: run.sessionId,
      source: run.source,
      startedAt: run.startedAt ?? null,
      status: run.status,
      stepSummary: resolveWorkflowStepSummary(run.steps),
      updatedAt: run.updatedAt,
      workflowDefinitionId: run.workflowDefinitionId ?? null,
      workflowName: run.workflowDefinitionId
        ? (workflowNameById.get(run.workflowDefinitionId) ?? "Deleted workflow")
        : "Deleted workflow",
    }));
  }, [agentNameById, data.WorkflowRuns, workflowNameById]);

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

  const companyAggregates = useMemo(() => {
    return UsageMetrics.fromGraphqlAggregates([
      ...data.companyTotal,
      ...data.companyDaily,
      ...data.companyMonthly,
    ]);
  }, [data.companyDaily, data.companyMonthly, data.companyTotal]);

  const companyId = meCompany.id;
  const totalUsage = UsageMetrics.findTotalAggregate(companyAggregates, "company", companyId);
  const currentDayUsage = UsageMetrics.findCurrentDayAggregate(companyAggregates, "company", companyId);
  const currentMonthUsage = UsageMetrics.findCurrentMonthAggregate(companyAggregates, "company", companyId);
  const organizationName = organizationState.organization?.name || meCompany.name;
  const now = Date.now();

  const runningTasks = [...tasks]
    .filter((task) => task.status === "in_progress")
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  const completedTasks = [...tasks]
    .filter((task) => task.status === "completed" && task.completedAt)
    .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime());
  const runningWorkflowRuns = [...workflowRuns]
    .filter((run) => run.status === "running")
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  const completedWorkflowRuns = [...workflowRuns]
    .filter((run) => run.status === "done" && run.completedAt)
    .sort((left, right) => new Date(right.completedAt ?? right.updatedAt).getTime() - new Date(left.completedAt ?? left.updatedAt).getTime());

  const taskCompletionStats = buildWindowStats(
    completedTasks.map((task) => task.completedAt),
    now,
  );
  const workflowCompletionStats = buildWindowStats(
    completedWorkflowRuns.map((run) => run.completedAt),
    now,
  );

  const runningEnvironmentCount = environments.filter((environment) => environment.status.toLowerCase() === "running").length;
  const stoppedEnvironmentCount = environments.filter((environment) => environment.status.toLowerCase() === "stopped").length;
  const otherEnvironmentCount = environments.length - runningEnvironmentCount - stoppedEnvironmentCount;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
          {organizationName}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Company activity across usage, tasks, workflow runs, and live environments.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <TasksSection
          description={`${runningTasks.length} tasks are currently in progress.`}
          emptyStateDescription="Tasks move here once work starts on them."
          emptyStateTitle="No running tasks"
          tasks={runningTasks.slice(0, DASHBOARD_SECTION_LIMIT)}
          timestampLabel="Updated"
          title="Running tasks"
          totalCount={runningTasks.length}
        />
        <WorkflowRunsSection
          description={`${runningWorkflowRuns.length} workflow runs are currently active.`}
          emptyStateDescription="Manual or scheduled workflow runs will appear here while they are executing."
          emptyStateTitle="No running workflow runs"
          runs={runningWorkflowRuns.slice(0, DASHBOARD_SECTION_LIMIT)}
          timestampLabel="Updated"
          title="Running workflow runs"
          totalCount={runningWorkflowRuns.length}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TasksSection
          description="Latest completed tasks, with rolling completion counts for the last day and month."
          emptyStateDescription="Completed tasks will appear here once operators close them out."
          emptyStateTitle="No completed tasks yet"
          stats={taskCompletionStats}
          tasks={completedTasks.slice(0, DASHBOARD_SECTION_LIMIT)}
          timestampLabel="Completed"
          title="Completed tasks"
          totalCount={completedTasks.length}
        />
        <WorkflowRunsSection
          description="Latest completed workflow runs, with rolling completion counts for the last day and month."
          emptyStateDescription="Completed workflow runs will appear here after runs finish successfully."
          emptyStateTitle="No completed workflow runs yet"
          runs={completedWorkflowRuns.slice(0, DASHBOARD_SECTION_LIMIT)}
          stats={workflowCompletionStats}
          timestampLabel="Completed"
          title="Completed workflow runs"
          totalCount={completedWorkflowRuns.length}
        />
      </div>

      <UsageSection
        currentDayUsage={currentDayUsage}
        currentMonthUsage={currentMonthUsage}
        organizationName={organizationName}
        totalUsage={totalUsage}
      />

      <EnvironmentsSection
        environments={environments.slice(0, DASHBOARD_SECTION_LIMIT)}
        otherCount={otherEnvironmentCount}
        runningCount={runningEnvironmentCount}
        stoppedCount={stoppedEnvironmentCount}
        totalCount={environments.length}
      />
    </main>
  );
}

function buildWindowStats(
  values: Array<string | null>,
  now: number,
): DashboardWindowStat[] {
  return [{
    label: "Past 24h",
    value: countValuesSince(values, now - oneDayInMilliseconds),
  }, {
    label: "Past 30d",
    value: countValuesSince(values, now - thirtyDaysInMilliseconds),
  }, {
    label: "All time",
    value: values.filter((value) => value !== null).length,
  }];
}

function countValuesSince(values: Array<string | null>, threshold: number): number {
  return values.filter((value) => {
    if (!value) {
      return false;
    }

    return new Date(value).getTime() >= threshold;
  }).length;
}

function resolveWorkflowStepSummary(
  steps: dashboardPageQuery["response"]["WorkflowRuns"][number]["steps"],
): string {
  const counts = {
    done: 0,
    pending: 0,
    running: 0,
  };

  for (const step of steps) {
    if (step.status === "done" || step.status === "pending" || step.status === "running") {
      counts[step.status] += 1;
    }
  }

  return `${counts.done} done / ${counts.running} running / ${counts.pending} pending`;
}

export function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <DashboardPageContent />
    </Suspense>
  );
}
