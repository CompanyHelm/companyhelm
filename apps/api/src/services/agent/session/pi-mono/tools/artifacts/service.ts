import type {
  ArtifactPullRequestProvider,
  ArtifactRecord,
  ArtifactScope,
  ArtifactState,
} from "../../../../../../services/artifact_service.ts";
import { ArtifactService } from "../../../../../../services/artifact_service.ts";
import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";

/**
 * Binds the generic artifact catalog service to the current PI Mono prompt context so artifact
 * tools can act within the company, agent, and session boundary without repeating those identifiers
 * in every call site.
 */
export class AgentArtifactToolService {
  private readonly agentId: string;
  private readonly artifactService: ArtifactService;
  private readonly companyId: string;
  private readonly sessionId: string;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    sessionId: string,
    artifactService: ArtifactService,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.agentId = agentId;
    this.sessionId = sessionId;
    this.artifactService = artifactService;
  }

  async listArtifacts(input: {
    scopeType: ArtifactScope;
    taskId?: string | null;
  }): Promise<ArtifactRecord[]> {
    return this.artifactService.listArtifacts(this.transactionProvider, {
      companyId: this.companyId,
      scopeType: input.scopeType,
      sessionId: input.scopeType === "session" ? this.sessionId : null,
      taskId: input.taskId,
    });
  }

  async getArtifact(artifactId: string): Promise<ArtifactRecord> {
    return this.artifactService.getArtifact(this.transactionProvider, {
      artifactId,
      companyId: this.companyId,
    });
  }

  async createMarkdownArtifact(input: {
    contentMarkdown: string;
    description?: string | null;
    name: string;
    scopeType: ArtifactScope;
    state?: ArtifactState | null;
    taskId?: string | null;
  }): Promise<ArtifactRecord> {
    return this.artifactService.createMarkdownArtifact(this.transactionProvider, {
      companyId: this.companyId,
      contentMarkdown: input.contentMarkdown,
      createdByAgentId: this.agentId,
      createdBySessionId: this.sessionId,
      description: input.description,
      name: input.name,
      scopeType: input.scopeType,
      sessionId: input.scopeType === "session" ? this.sessionId : null,
      state: input.state,
      taskId: input.taskId,
    });
  }

  async createExternalLinkArtifact(input: {
    description?: string | null;
    name: string;
    scopeType: ArtifactScope;
    state?: ArtifactState | null;
    taskId?: string | null;
    url: string;
  }): Promise<ArtifactRecord> {
    return this.artifactService.createExternalLinkArtifact(this.transactionProvider, {
      companyId: this.companyId,
      createdByAgentId: this.agentId,
      createdBySessionId: this.sessionId,
      description: input.description,
      name: input.name,
      scopeType: input.scopeType,
      sessionId: input.scopeType === "session" ? this.sessionId : null,
      state: input.state,
      taskId: input.taskId,
      url: input.url,
    });
  }

  async createPullRequestArtifact(input: {
    description?: string | null;
    name: string;
    provider?: ArtifactPullRequestProvider | null;
    pullRequestNumber?: number | null;
    repository?: string | null;
    scopeType: ArtifactScope;
    state?: ArtifactState | null;
    taskId?: string | null;
    url: string;
  }): Promise<ArtifactRecord> {
    return this.artifactService.createPullRequestArtifact(this.transactionProvider, {
      companyId: this.companyId,
      createdByAgentId: this.agentId,
      createdBySessionId: this.sessionId,
      description: input.description,
      name: input.name,
      provider: input.provider,
      pullRequestNumber: input.pullRequestNumber,
      repository: input.repository,
      scopeType: input.scopeType,
      sessionId: input.scopeType === "session" ? this.sessionId : null,
      state: input.state,
      taskId: input.taskId,
      url: input.url,
    });
  }

  async updateArtifactMetadata(input: {
    artifactId: string;
    description?: string | null;
    name?: string | null;
    state?: ArtifactState | null;
  }): Promise<ArtifactRecord> {
    return this.artifactService.updateArtifactMetadata(this.transactionProvider, {
      artifactId: input.artifactId,
      companyId: this.companyId,
      description: input.description,
      name: input.name,
      state: input.state,
      updatedByAgentId: this.agentId,
    });
  }

  async updateMarkdownArtifact(input: {
    artifactId: string;
    contentMarkdown: string;
  }): Promise<ArtifactRecord> {
    return this.artifactService.updateMarkdownArtifact(this.transactionProvider, {
      artifactId: input.artifactId,
      companyId: this.companyId,
      contentMarkdown: input.contentMarkdown,
      updatedByAgentId: this.agentId,
    });
  }

  async updateExternalLinkArtifact(input: {
    artifactId: string;
    url: string;
  }): Promise<ArtifactRecord> {
    return this.artifactService.updateExternalLinkArtifact(this.transactionProvider, {
      artifactId: input.artifactId,
      companyId: this.companyId,
      updatedByAgentId: this.agentId,
      url: input.url,
    });
  }

  async archiveArtifact(artifactId: string): Promise<ArtifactRecord> {
    return this.artifactService.archiveArtifact(this.transactionProvider, {
      artifactId,
      companyId: this.companyId,
      updatedByAgentId: this.agentId,
    });
  }
}
