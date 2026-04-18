import { and, eq, inArray, isNull } from "drizzle-orm";
import { injectable } from "inversify";
import {
  artifactExternalLinks,
  artifactMarkdownDocuments,
  artifactPullRequests,
  artifacts,
  tasks,
  artifactPullRequestProviderEnum,
  artifactScopeEnum,
  artifactStateEnum,
  artifactTypeEnum,
} from "../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../db/transaction_provider_interface.ts";

export type ArtifactScope = typeof artifactScopeEnum.enumValues[number];
export type ArtifactType = typeof artifactTypeEnum.enumValues[number];
export type ArtifactState = typeof artifactStateEnum.enumValues[number];
export type ArtifactPullRequestProvider = typeof artifactPullRequestProviderEnum.enumValues[number];

export type ArtifactRecord = {
  id: string;
  createdBySessionId: string | null;
  taskId: string | null;
  scopeType: ArtifactScope;
  type: ArtifactType;
  state: ArtifactState;
  name: string;
  description: string | null;
  markdownContent: string | null;
  url: string | null;
  pullRequestProvider: ArtifactPullRequestProvider | null;
  pullRequestRepository: string | null;
  pullRequestNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type ArtifactBaseRecord = {
  id: string;
  createdBySessionId: string | null;
  taskId: string | null;
  scopeType: ArtifactScope;
  type: ArtifactType;
  state: ArtifactState;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ArtifactMarkdownRecord = {
  artifactId: string;
  contentMarkdown: string;
};

type ArtifactExternalLinkRecord = {
  artifactId: string;
  url: string;
};

type ArtifactPullRequestRecord = {
  artifactId: string;
  provider: ArtifactPullRequestProvider;
  repository: string | null;
  pullRequestNumber: number | null;
  url: string;
};

/**
 * Owns the persisted artifact catalog that hangs off company or task scope. It keeps the shared
 * identity and lifecycle fields in the base artifact row while loading and mutating the
 * type-specific markdown, external-link, and pull-request payloads in their dedicated tables.
 */
@injectable()
export class ArtifactService {
  private static readonly supportedStates: ArtifactState[] = ["draft", "active", "archived"];
  private static readonly supportedScopes: ArtifactScope[] = ["company", "task"];

  async listArtifacts(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      scopeType: ArtifactScope;
      taskId?: string | null;
    },
  ): Promise<ArtifactRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const taskId = await this.resolveTaskIdForScope(tx, input.companyId, input.scopeType, input.taskId);
      const baseRecords = await tx
        .select(this.baseSelection())
        .from(artifacts)
        .where(and(
          eq(artifacts.companyId, input.companyId),
          eq(artifacts.scopeType, input.scopeType),
          taskId === null ? isNull(artifacts.taskId) : eq(artifacts.taskId, taskId),
        )) as ArtifactBaseRecord[];

      return (await this.hydrateArtifacts(tx, baseRecords))
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
    });
  }

  async getArtifact(
    transactionProvider: TransactionProviderInterface,
    input: {
      artifactId: string;
      companyId: string;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const artifact = await this.requireArtifact(tx, input.companyId, input.artifactId);
      const [hydratedArtifact] = await this.hydrateArtifacts(tx, [artifact]);
      if (!hydratedArtifact) {
        throw new Error("Artifact not found.");
      }

      return hydratedArtifact;
    });
  }

  async createMarkdownArtifact(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      createdByAgentId?: string | null;
      createdBySessionId?: string | null;
      createdByUserId?: string | null;
      description?: string | null;
      name: string;
      scopeType: ArtifactScope;
      state?: ArtifactState | null;
      taskId?: string | null;
      contentMarkdown: string;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const taskId = await this.resolveTaskIdForScope(tx, input.companyId, input.scopeType, input.taskId);
      const artifact = await this.insertBaseArtifact(tx, {
        companyId: input.companyId,
        createdByAgentId: input.createdByAgentId,
        createdBySessionId: input.createdBySessionId,
        createdByUserId: input.createdByUserId,
        description: input.description ?? null,
        name: input.name,
        scopeType: input.scopeType,
        state: input.state ?? "active",
        taskId,
        type: "markdown_document",
      });

      await tx.insert(artifactMarkdownDocuments).values({
        artifactId: artifact.id,
        contentMarkdown: this.requireNonEmptyText(input.contentMarkdown, "Markdown content"),
      });

      return this.getHydratedArtifact(tx, artifact);
    });
  }

  async createExternalLinkArtifact(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      createdByAgentId?: string | null;
      createdBySessionId?: string | null;
      createdByUserId?: string | null;
      description?: string | null;
      name: string;
      scopeType: ArtifactScope;
      state?: ArtifactState | null;
      taskId?: string | null;
      url: string;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const taskId = await this.resolveTaskIdForScope(tx, input.companyId, input.scopeType, input.taskId);
      const artifact = await this.insertBaseArtifact(tx, {
        companyId: input.companyId,
        createdByAgentId: input.createdByAgentId,
        createdBySessionId: input.createdBySessionId,
        createdByUserId: input.createdByUserId,
        description: input.description ?? null,
        name: input.name,
        scopeType: input.scopeType,
        state: input.state ?? "active",
        taskId,
        type: "external_link",
      });

      await tx.insert(artifactExternalLinks).values({
        artifactId: artifact.id,
        url: this.requireValidUrl(input.url, "External link URL"),
      });

      return this.getHydratedArtifact(tx, artifact);
    });
  }

  async createPullRequestArtifact(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      createdByAgentId?: string | null;
      createdBySessionId?: string | null;
      createdByUserId?: string | null;
      description?: string | null;
      name: string;
      provider?: ArtifactPullRequestProvider | null;
      pullRequestNumber?: number | null;
      repository?: string | null;
      scopeType: ArtifactScope;
      state?: ArtifactState | null;
      taskId?: string | null;
      url: string;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const taskId = await this.resolveTaskIdForScope(tx, input.companyId, input.scopeType, input.taskId);
      const artifact = await this.insertBaseArtifact(tx, {
        companyId: input.companyId,
        createdByAgentId: input.createdByAgentId,
        createdBySessionId: input.createdBySessionId,
        createdByUserId: input.createdByUserId,
        description: input.description ?? null,
        name: input.name,
        scopeType: input.scopeType,
        state: input.state ?? "active",
        taskId,
        type: "pull_request",
      });

      await tx.insert(artifactPullRequests).values({
        artifactId: artifact.id,
        provider: input.provider ?? "github",
        pullRequestNumber: this.resolvePullRequestNumber(input.pullRequestNumber),
        repository: input.repository ?? null,
        url: this.requireValidUrl(input.url, "Pull request URL"),
      });

      return this.getHydratedArtifact(tx, artifact);
    });
  }

  async updateArtifactMetadata(
    transactionProvider: TransactionProviderInterface,
    input: {
      artifactId: string;
      companyId: string;
      description?: string | null;
      name?: string | null;
      state?: ArtifactState | null;
      updatedByAgentId?: string | null;
      updatedByUserId?: string | null;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const existingArtifact = await this.requireArtifact(tx, input.companyId, input.artifactId);
      const [updatedArtifact] = await tx
        .update(artifacts)
        .set({
          description: input.description === undefined ? existingArtifact.description : input.description,
          name: input.name === undefined ? existingArtifact.name : this.requireNonEmptyText(input.name, "Artifact name"),
          state: input.state === undefined ? existingArtifact.state : this.requireState(input.state),
          updatedAt: new Date(),
          updatedByAgentId: input.updatedByAgentId ?? undefined,
          updatedByUserId: input.updatedByUserId ?? undefined,
        })
        .where(and(
          eq(artifacts.companyId, input.companyId),
          eq(artifacts.id, input.artifactId),
        ))
        .returning(this.baseSelection()) as ArtifactBaseRecord[];

      if (!updatedArtifact) {
        throw new Error("Artifact not found.");
      }

      return this.getHydratedArtifact(tx, updatedArtifact);
    });
  }

  async updateMarkdownArtifact(
    transactionProvider: TransactionProviderInterface,
    input: {
      artifactId: string;
      companyId: string;
      contentMarkdown: string;
      updatedByAgentId?: string | null;
      updatedByUserId?: string | null;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const artifact = await this.requireArtifactOfType(tx, input.companyId, input.artifactId, "markdown_document");
      await tx
        .update(artifactMarkdownDocuments)
        .set({
          contentMarkdown: this.requireNonEmptyText(input.contentMarkdown, "Markdown content"),
        })
        .where(eq(artifactMarkdownDocuments.artifactId, input.artifactId));
      await this.touchArtifact(tx, input.companyId, input.artifactId, input.updatedByUserId, input.updatedByAgentId);

      return this.getHydratedArtifact(tx, artifact);
    });
  }

  async updateExternalLinkArtifact(
    transactionProvider: TransactionProviderInterface,
    input: {
      artifactId: string;
      companyId: string;
      updatedByAgentId?: string | null;
      updatedByUserId?: string | null;
      url: string;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const artifact = await this.requireArtifactOfType(tx, input.companyId, input.artifactId, "external_link");
      await tx
        .update(artifactExternalLinks)
        .set({
          url: this.requireValidUrl(input.url, "External link URL"),
        })
        .where(eq(artifactExternalLinks.artifactId, input.artifactId));
      await this.touchArtifact(tx, input.companyId, input.artifactId, input.updatedByUserId, input.updatedByAgentId);

      return this.getHydratedArtifact(tx, artifact);
    });
  }

  async archiveArtifact(
    transactionProvider: TransactionProviderInterface,
    input: {
      artifactId: string;
      companyId: string;
      updatedByAgentId?: string | null;
      updatedByUserId?: string | null;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const [updatedArtifact] = await tx
        .update(artifacts)
        .set({
          state: "archived",
          updatedAt: new Date(),
          updatedByAgentId: input.updatedByAgentId ?? undefined,
          updatedByUserId: input.updatedByUserId ?? undefined,
        })
        .where(and(
          eq(artifacts.companyId, input.companyId),
          eq(artifacts.id, input.artifactId),
        ))
        .returning(this.baseSelection()) as ArtifactBaseRecord[];

      if (!updatedArtifact) {
        throw new Error("Artifact not found.");
      }

      return this.getHydratedArtifact(tx, updatedArtifact);
    });
  }

  async deleteArtifact(
    transactionProvider: TransactionProviderInterface,
    input: {
      artifactId: string;
      companyId: string;
    },
  ): Promise<ArtifactRecord> {
    return transactionProvider.transaction(async (tx) => {
      const existingArtifact = await this.requireArtifact(tx, input.companyId, input.artifactId);
      const hydratedArtifact = await this.getHydratedArtifact(tx, existingArtifact);

      await tx
        .delete(artifacts)
        .where(and(
          eq(artifacts.companyId, input.companyId),
          eq(artifacts.id, input.artifactId),
        ));

      return hydratedArtifact;
    });
  }

  private async getHydratedArtifact(
    tx: AppRuntimeTransaction,
    artifact: ArtifactBaseRecord,
  ): Promise<ArtifactRecord> {
    const [hydratedArtifact] = await this.hydrateArtifacts(tx, [artifact]);
    if (!hydratedArtifact) {
      throw new Error("Artifact not found.");
    }

    return hydratedArtifact;
  }

  private async hydrateArtifacts(
    tx: AppRuntimeTransaction,
    baseArtifacts: ArtifactBaseRecord[],
  ): Promise<ArtifactRecord[]> {
    if (baseArtifacts.length === 0) {
      return [];
    }

    const markdownArtifactIds = baseArtifacts
      .filter((artifact) => artifact.type === "markdown_document")
      .map((artifact) => artifact.id);
    const externalLinkArtifactIds = baseArtifacts
      .filter((artifact) => artifact.type === "external_link")
      .map((artifact) => artifact.id);
    const pullRequestArtifactIds = baseArtifacts
      .filter((artifact) => artifact.type === "pull_request")
      .map((artifact) => artifact.id);

    const markdownRecords = markdownArtifactIds.length === 0
      ? []
      : await tx
        .select({
          artifactId: artifactMarkdownDocuments.artifactId,
          contentMarkdown: artifactMarkdownDocuments.contentMarkdown,
        })
        .from(artifactMarkdownDocuments)
        .where(inArray(artifactMarkdownDocuments.artifactId, markdownArtifactIds)) as ArtifactMarkdownRecord[];
    const externalLinkRecords = externalLinkArtifactIds.length === 0
      ? []
      : await tx
        .select({
          artifactId: artifactExternalLinks.artifactId,
          url: artifactExternalLinks.url,
        })
        .from(artifactExternalLinks)
        .where(inArray(artifactExternalLinks.artifactId, externalLinkArtifactIds)) as ArtifactExternalLinkRecord[];
    const pullRequestRecords = pullRequestArtifactIds.length === 0
      ? []
      : await tx
        .select({
          artifactId: artifactPullRequests.artifactId,
          provider: artifactPullRequests.provider,
          pullRequestNumber: artifactPullRequests.pullRequestNumber,
          repository: artifactPullRequests.repository,
          url: artifactPullRequests.url,
        })
        .from(artifactPullRequests)
        .where(inArray(artifactPullRequests.artifactId, pullRequestArtifactIds)) as ArtifactPullRequestRecord[];

    const markdownRecordByArtifactId = new Map(markdownRecords.map((record) => [record.artifactId, record]));
    const externalLinkRecordByArtifactId = new Map(externalLinkRecords.map((record) => [record.artifactId, record]));
    const pullRequestRecordByArtifactId = new Map(pullRequestRecords.map((record) => [record.artifactId, record]));

    return baseArtifacts.map((artifact) => {
      const markdownRecord = markdownRecordByArtifactId.get(artifact.id) ?? null;
      const externalLinkRecord = externalLinkRecordByArtifactId.get(artifact.id) ?? null;
      const pullRequestRecord = pullRequestRecordByArtifactId.get(artifact.id) ?? null;

      return {
        id: artifact.id,
        createdBySessionId: artifact.createdBySessionId,
        taskId: artifact.taskId,
        scopeType: artifact.scopeType,
        type: artifact.type,
        state: artifact.state,
        name: artifact.name,
        description: artifact.description,
        markdownContent: markdownRecord?.contentMarkdown ?? null,
        pullRequestNumber: pullRequestRecord?.pullRequestNumber ?? null,
        pullRequestProvider: pullRequestRecord?.provider ?? null,
        pullRequestRepository: pullRequestRecord?.repository ?? null,
        url: externalLinkRecord?.url ?? pullRequestRecord?.url ?? null,
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt,
      };
    });
  }

  private async insertBaseArtifact(
    tx: AppRuntimeTransaction,
    input: {
      companyId: string;
      createdByAgentId?: string | null;
      createdBySessionId?: string | null;
      createdByUserId?: string | null;
      description: string | null;
      name: string;
      scopeType: ArtifactScope;
      state: ArtifactState;
      taskId: string | null;
      type: ArtifactType;
    },
  ): Promise<ArtifactBaseRecord> {
    const now = new Date();
    const [artifact] = await tx
      .insert(artifacts)
      .values({
        companyId: input.companyId,
        createdAt: now,
        createdByAgentId: input.createdByAgentId ?? null,
        createdBySessionId: input.createdBySessionId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        description: input.description,
        name: this.requireNonEmptyText(input.name, "Artifact name"),
        scopeType: input.scopeType,
        state: this.requireState(input.state),
        taskId: input.taskId,
        type: input.type,
        updatedAt: now,
        updatedByAgentId: input.createdByAgentId ?? null,
        updatedByUserId: input.createdByUserId ?? null,
      })
      .returning(this.baseSelection()) as ArtifactBaseRecord[];

    if (!artifact) {
      throw new Error("Failed to create artifact.");
    }

    return artifact;
  }

  private async touchArtifact(
    tx: AppRuntimeTransaction,
    companyId: string,
    artifactId: string,
    updatedByUserId?: string | null,
    updatedByAgentId?: string | null,
  ): Promise<void> {
    await tx
      .update(artifacts)
      .set({
        updatedAt: new Date(),
        updatedByAgentId: updatedByAgentId ?? undefined,
        updatedByUserId: updatedByUserId ?? undefined,
      })
      .where(and(
        eq(artifacts.companyId, companyId),
        eq(artifacts.id, artifactId),
      ));
  }

  private async requireArtifact(
    tx: AppRuntimeTransaction,
    companyId: string,
    artifactId: string,
  ): Promise<ArtifactBaseRecord> {
    const [artifact] = await tx
      .select(this.baseSelection())
      .from(artifacts)
      .where(and(
        eq(artifacts.companyId, companyId),
        eq(artifacts.id, artifactId),
      )) as ArtifactBaseRecord[];

    if (!artifact) {
      throw new Error("Artifact not found.");
    }

    return artifact;
  }

  private async requireArtifactOfType(
    tx: AppRuntimeTransaction,
    companyId: string,
    artifactId: string,
    expectedType: ArtifactType,
  ): Promise<ArtifactBaseRecord> {
    const artifact = await this.requireArtifact(tx, companyId, artifactId);
    if (artifact.type !== expectedType) {
      throw new Error(`Artifact is not a ${expectedType}.`);
    }

    return artifact;
  }

  private async resolveTaskIdForScope(
    tx: AppRuntimeTransaction,
    companyId: string,
    scopeType: ArtifactScope,
    taskId?: string | null,
  ): Promise<string | null> {
    if (!ArtifactService.supportedScopes.includes(scopeType)) {
      throw new Error("Unsupported artifact scope.");
    }

    if (scopeType === "company") {
      if (taskId) {
        throw new Error("taskId is not allowed for company-scoped artifacts.");
      }

      return null;
    }

    if (!taskId) {
      throw new Error("taskId is required for task-scoped artifacts.");
    }

    await this.requireTask(tx, companyId, taskId);

    return taskId;
  }

  private async requireTask(
    tx: AppRuntimeTransaction,
    companyId: string,
    taskId: string,
  ): Promise<void> {
    const existingTasks = await tx
      .select({
        id: tasks.id,
      })
      .from(tasks)
      .where(and(
        eq(tasks.companyId, companyId),
        eq(tasks.id, taskId),
      )) as Array<{ id: string }>;
    if (existingTasks.length === 0) {
      throw new Error("Task not found.");
    }
  }

  private requireState(state: ArtifactState): ArtifactState {
    if (!ArtifactService.supportedStates.includes(state)) {
      throw new Error("Unsupported artifact state.");
    }

    return state;
  }

  private requireNonEmptyText(value: string | null, label: string): string {
    if (value === null || !/\S/.test(value)) {
      throw new Error(`${label} is required.`);
    }

    return value;
  }

  private requireValidUrl(value: string, label: string): string {
    if (!/\S/.test(value)) {
      throw new Error(`${label} is required.`);
    }

    try {
      new URL(value);
    } catch {
      throw new Error(`${label} must be a valid URL.`);
    }

    return value;
  }

  private resolvePullRequestNumber(value?: number | null): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error("Pull request number must be a positive integer.");
    }

    return value;
  }

  private baseSelection(): {
    id: typeof artifacts.id;
    createdBySessionId: typeof artifacts.createdBySessionId;
    taskId: typeof artifacts.taskId;
    scopeType: typeof artifacts.scopeType;
    type: typeof artifacts.type;
    state: typeof artifacts.state;
    name: typeof artifacts.name;
    description: typeof artifacts.description;
    createdAt: typeof artifacts.createdAt;
    updatedAt: typeof artifacts.updatedAt;
  } {
    return {
      id: artifacts.id,
      createdBySessionId: artifacts.createdBySessionId,
      taskId: artifacts.taskId,
      scopeType: artifacts.scopeType,
      type: artifacts.type,
      state: artifacts.state,
      name: artifacts.name,
      description: artifacts.description,
      createdAt: artifacts.createdAt,
      updatedAt: artifacts.updatedAt,
    };
  }
}
