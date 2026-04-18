import type { ArtifactRecord } from "../services/artifact_service.ts";

export type GraphqlArtifactRecord = {
  id: string;
  createdBySessionId: string | null;
  taskId: string | null;
  scopeType: string;
  type: string;
  state: string;
  name: string;
  description: string | null;
  markdownContent: string | null;
  url: string | null;
  pullRequestProvider: string | null;
  pullRequestRepository: string | null;
  pullRequestNumber: number | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Keeps GraphQL artifact serialization consistent so resolvers and mutations can share one
 * flattened payload shape even though the storage layer uses a base row plus subtype tables.
 */
export class GraphqlArtifactPresenter {
  static present(record: ArtifactRecord): GraphqlArtifactRecord {
    return {
      id: record.id,
      createdBySessionId: record.createdBySessionId,
      taskId: record.taskId,
      scopeType: record.scopeType,
      type: record.type,
      state: record.state,
      name: record.name,
      description: record.description,
      markdownContent: record.markdownContent,
      url: record.url,
      pullRequestProvider: record.pullRequestProvider,
      pullRequestRepository: record.pullRequestRepository,
      pullRequestNumber: record.pullRequestNumber,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
