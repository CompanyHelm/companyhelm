import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentArchiveArtifactTool } from "./archive_artifact.ts";
import { AgentCreateExternalLinkArtifactTool } from "./create_external_link_artifact.ts";
import { AgentCreateMarkdownArtifactTool } from "./create_markdown_artifact.ts";
import { AgentCreatePullRequestArtifactTool } from "./create_pull_request_artifact.ts";
import { AgentGetArtifactTool } from "./get_artifact.ts";
import { AgentListArtifactsTool } from "./list_artifacts.ts";
import { AgentArtifactToolService } from "./service.ts";
import { AgentUpdateArtifactMetadataTool } from "./update_artifact_metadata.ts";
import { AgentUpdateExternalLinkArtifactTool } from "./update_external_link_artifact.ts";
import { AgentUpdateMarkdownArtifactTool } from "./update_markdown_artifact.ts";

/**
 * Groups artifact-focused PI Mono tools behind one provider so the shared tool catalog can expose
 * durable doc and link management without coupling the top-level session manager to each tool.
 */
export class AgentArtifactToolProvider extends AgentToolProviderInterface {
  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    super();
    this.artifactToolService = artifactToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentListArtifactsTool(this.artifactToolService).createDefinition(),
      new AgentGetArtifactTool(this.artifactToolService).createDefinition(),
      new AgentCreateMarkdownArtifactTool(this.artifactToolService).createDefinition(),
      new AgentCreateExternalLinkArtifactTool(this.artifactToolService).createDefinition(),
      new AgentCreatePullRequestArtifactTool(this.artifactToolService).createDefinition(),
      new AgentUpdateArtifactMetadataTool(this.artifactToolService).createDefinition(),
      new AgentUpdateMarkdownArtifactTool(this.artifactToolService).createDefinition(),
      new AgentUpdateExternalLinkArtifactTool(this.artifactToolService).createDefinition(),
      new AgentArchiveArtifactTool(this.artifactToolService).createDefinition(),
    ];
  }
}
