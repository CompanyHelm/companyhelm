import type { ArtifactRecord } from "../../../../services/artifact_service.ts";

/**
 * Formats artifact tool payloads into compact transcript text so the agent can inspect artifact
 * metadata without each tool needing to duplicate rendering logic.
 */
export class AgentArtifactResultFormatter {
  static formatArtifact(artifact: ArtifactRecord): string {
    const lines = [
      `artifactId: ${artifact.id}`,
      `scopeType: ${artifact.scopeType}`,
      artifact.taskId ? `taskId: ${artifact.taskId}` : null,
      `type: ${artifact.type}`,
      `state: ${artifact.state}`,
      `name: ${artifact.name}`,
      artifact.description ? `description: ${artifact.description}` : null,
      artifact.url ? `url: ${artifact.url}` : null,
      artifact.pullRequestProvider ? `pullRequestProvider: ${artifact.pullRequestProvider}` : null,
      artifact.pullRequestRepository ? `pullRequestRepository: ${artifact.pullRequestRepository}` : null,
      artifact.pullRequestNumber !== null ? `pullRequestNumber: ${artifact.pullRequestNumber}` : null,
      artifact.markdownContent ? ["markdownContent:", artifact.markdownContent].join("\n") : null,
      `createdAt: ${artifact.createdAt.toISOString()}`,
      `updatedAt: ${artifact.updatedAt.toISOString()}`,
    ];

    return lines.filter((line): line is string => line !== null).join("\n");
  }

  static formatArtifactList(artifacts: ArtifactRecord[]): string {
    if (artifacts.length === 0) {
      return "No artifacts found.";
    }

    return artifacts.map((artifact) => {
      return [
        `- ${artifact.id}`,
        `  name: ${artifact.name}`,
        `  type: ${artifact.type}`,
        `  scopeType: ${artifact.scopeType}`,
        `  state: ${artifact.state}`,
        artifact.taskId ? `  taskId: ${artifact.taskId}` : null,
        artifact.url ? `  url: ${artifact.url}` : null,
      ].filter((line): line is string => line !== null).join("\n");
    }).join("\n");
  }
}
