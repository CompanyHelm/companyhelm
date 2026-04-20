import type {
  ArtifactPullRequestProvider,
  ArtifactScope,
  ArtifactState,
} from "../artifact_service.ts";
import { ArtifactService } from "../artifact_service.ts";
import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { AgentArtifactToolService } from "../agent/session/pi-mono/tools/artifacts/service.ts";
import { SystemCommandInputReader } from "./input_reader.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

/**
 * Implements artifact system commands against the existing artifact service boundary. Artifacts are
 * durable user-visible records, so every command returns the full updated record or the discovered
 * list as JSON instead of transcript-formatted text.
 */
export class ArtifactManagementSystemCommandService {
  private readonly artifactService: ArtifactService;
  private readonly inputReader = new SystemCommandInputReader();
  private readonly jsonSerializer = new SystemCommandJsonSerializer();

  constructor(artifactService: ArtifactService) {
    this.artifactService = artifactService;
  }

  async execute(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const service = new AgentArtifactToolService(
      context.transactionProvider,
      context.companyId,
      context.agentId,
      context.sessionId,
      this.artifactService,
    );

    switch (commandId) {
      case "artifact.list":
        return this.jsonSerializer.serializeRecord({
          artifacts: await service.listArtifacts(this.readListInput(input)),
        });
      case "artifact.get":
        return this.jsonSerializer.serializeRecord({
          artifact: await service.getArtifact(this.readArtifactId(input)),
        });
      case "artifact.markdown.create":
        return this.jsonSerializer.serializeRecord({
          artifact: await service.createMarkdownArtifact(this.readCreateMarkdownInput(input)),
        });
      case "artifact.external_link.create":
        return this.jsonSerializer.serializeRecord({
          artifact: await service.createExternalLinkArtifact(this.readCreateExternalLinkInput(input)),
        });
      case "artifact.pull_request.create":
        return this.jsonSerializer.serializeRecord({
          artifact: await service.createPullRequestArtifact(this.readCreatePullRequestInput(input)),
        });
      case "artifact.metadata.update":
        return this.jsonSerializer.serializeRecord({
          artifact: await service.updateArtifactMetadata(this.readUpdateMetadataInput(input)),
        });
      case "artifact.markdown.update":
        return this.jsonSerializer.serializeRecord({
          artifact: await service.updateMarkdownArtifact(this.readUpdateMarkdownInput(input)),
        });
      case "artifact.external_link.update":
        return this.jsonSerializer.serializeRecord({
          artifact: await service.updateExternalLinkArtifact(this.readUpdateExternalLinkInput(input)),
        });
      case "artifact.archive":
        return this.jsonSerializer.serializeRecord({
          artifact: await service.archiveArtifact(this.readArtifactId(input)),
        });
      default:
        throw new Error(`System command ${commandId} is not handled by artifact management.`);
    }
  }

  private readListInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      scopeType: this.readScope(payload),
      taskId: this.inputReader.optionalNullableString(payload, "taskId"),
    };
  }

  private readCreateMarkdownInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      contentMarkdown: this.inputReader.requireString(payload, "contentMarkdown"),
      description: this.inputReader.optionalNullableString(payload, "description"),
      name: this.inputReader.requireString(payload, "name"),
      scopeType: this.readScope(payload),
      state: this.readState(payload),
      taskId: this.inputReader.optionalNullableString(payload, "taskId"),
    };
  }

  private readCreateExternalLinkInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      description: this.inputReader.optionalNullableString(payload, "description"),
      name: this.inputReader.requireString(payload, "name"),
      scopeType: this.readScope(payload),
      state: this.readState(payload),
      taskId: this.inputReader.optionalNullableString(payload, "taskId"),
      url: this.inputReader.requireString(payload, "url"),
    };
  }

  private readCreatePullRequestInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      description: this.inputReader.optionalNullableString(payload, "description"),
      name: this.inputReader.requireString(payload, "name"),
      provider: this.readPullRequestProvider(payload),
      pullRequestNumber: this.inputReader.optionalInteger(payload, "pullRequestNumber"),
      repository: this.inputReader.optionalNullableString(payload, "repository"),
      scopeType: this.readScope(payload),
      state: this.readState(payload),
      taskId: this.inputReader.optionalNullableString(payload, "taskId"),
      url: this.inputReader.requireString(payload, "url"),
    };
  }

  private readUpdateMetadataInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      artifactId: this.inputReader.requireString(payload, "artifactId"),
      description: this.inputReader.optionalNullableString(payload, "description"),
      name: this.inputReader.optionalNullableString(payload, "name"),
      state: this.readState(payload),
    };
  }

  private readUpdateMarkdownInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      artifactId: this.inputReader.requireString(payload, "artifactId"),
      contentMarkdown: this.inputReader.requireString(payload, "contentMarkdown"),
    };
  }

  private readUpdateExternalLinkInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      artifactId: this.inputReader.requireString(payload, "artifactId"),
      url: this.inputReader.requireString(payload, "url"),
    };
  }

  private readArtifactId(input: unknown): string {
    return this.inputReader.requireString(this.inputReader.requireRecord(input), "artifactId");
  }

  private readScope(payload: Record<string, unknown>): ArtifactScope {
    const scopeType = this.inputReader.requireString(payload, "scopeType");
    if (scopeType !== "company" && scopeType !== "task" && scopeType !== "session") {
      throw new Error("scopeType must be company, task, or session.");
    }

    return scopeType;
  }

  private readState(payload: Record<string, unknown>): ArtifactState | null | undefined {
    const state = this.inputReader.optionalNullableString(payload, "state");
    if (state === undefined || state === null) {
      return state;
    }
    if (state !== "draft" && state !== "active" && state !== "archived") {
      throw new Error("state must be draft, active, archived, or null.");
    }

    return state;
  }

  private readPullRequestProvider(
    payload: Record<string, unknown>,
  ): ArtifactPullRequestProvider | null | undefined {
    const provider = this.inputReader.optionalNullableString(payload, "provider");
    if (provider === undefined || provider === null) {
      return provider;
    }
    if (provider !== "github") {
      throw new Error("provider must be github or null.");
    }

    return provider;
  }
}
