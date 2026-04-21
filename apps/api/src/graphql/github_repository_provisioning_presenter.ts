import type {
  GithubRepositoryProvisioningRecord,
  GithubRepositoryProvisioningRepositoryRecord,
} from "../services/repositories/provisioning_service.ts";

export type GraphqlGithubRepositoryRecord = {
  archived: boolean;
  createdAt: string;
  defaultBranch: string | null;
  externalId: string;
  fullName: string;
  githubInstallationId: string;
  htmlUrl: string | null;
  id: string;
  isPrivate: boolean;
  name: string;
  updatedAt: string;
};

export type GraphqlGithubRepositoryProvisioningRecord = {
  companyId: string;
  createdAt: string;
  githubRepository: GraphqlGithubRepositoryRecord;
  id: string;
  updatedAt: string;
};

/**
 * Converts workspace repository provisioning records into the GraphQL shape shared by queries and
 * mutations, keeping nested GitHub repository serialization consistent across the API.
 */
export class GithubRepositoryProvisioningPresenter {
  static presentProvisioning(
    provisioning: GithubRepositoryProvisioningRecord,
  ): GraphqlGithubRepositoryProvisioningRecord {
    return {
      companyId: provisioning.companyId,
      createdAt: provisioning.createdAt.toISOString(),
      githubRepository: GithubRepositoryProvisioningPresenter.presentRepository(provisioning.githubRepository),
      id: provisioning.id,
      updatedAt: provisioning.updatedAt.toISOString(),
    };
  }

  private static presentRepository(
    repository: GithubRepositoryProvisioningRepositoryRecord,
  ): GraphqlGithubRepositoryRecord {
    return {
      archived: repository.archived,
      createdAt: repository.createdAt.toISOString(),
      defaultBranch: repository.defaultBranch,
      externalId: repository.externalId,
      fullName: repository.fullName,
      githubInstallationId: String(repository.installationId),
      htmlUrl: repository.htmlUrl,
      id: repository.id,
      isPrivate: repository.isPrivate,
      name: repository.name,
      updatedAt: repository.updatedAt.toISOString(),
    };
  }
}
