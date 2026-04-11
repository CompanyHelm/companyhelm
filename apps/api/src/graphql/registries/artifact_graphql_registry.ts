import { inject, injectable } from "inversify";
import { ArchiveArtifactMutation } from "../mutations/archive_artifact.ts";
import { CreateExternalLinkArtifactMutation } from "../mutations/create_external_link_artifact.ts";
import { CreateMarkdownArtifactMutation } from "../mutations/create_markdown_artifact.ts";
import { CreatePullRequestArtifactMutation } from "../mutations/create_pull_request_artifact.ts";
import { DeleteArtifactMutation } from "../mutations/delete_artifact.ts";
import { UpdateArtifactMutation } from "../mutations/update_artifact.ts";
import { UpdateExternalLinkArtifactMutation } from "../mutations/update_external_link_artifact.ts";
import { UpdateMarkdownArtifactMutation } from "../mutations/update_markdown_artifact.ts";
import { ArtifactQueryResolver } from "../resolvers/artifact.ts";
import { ArtifactsQueryResolver } from "../resolvers/artifacts.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

/**
 * Groups the artifact queries and mutations so artifact CRUD stays isolated from session and
 * agent composition code.
 */
@injectable()
export class ArtifactGraphqlRegistry implements GraphqlRegistryInterface {
  constructor(
    @inject(ArtifactQueryResolver)
    private readonly artifactQueryResolver: ArtifactQueryResolver = new ArtifactQueryResolver(),
    @inject(ArtifactsQueryResolver)
    private readonly artifactsQueryResolver: ArtifactsQueryResolver = new ArtifactsQueryResolver(),
    @inject(CreateMarkdownArtifactMutation)
    private readonly createMarkdownArtifactMutation: CreateMarkdownArtifactMutation = new CreateMarkdownArtifactMutation(),
    @inject(CreateExternalLinkArtifactMutation)
    private readonly createExternalLinkArtifactMutation: CreateExternalLinkArtifactMutation = new CreateExternalLinkArtifactMutation(),
    @inject(CreatePullRequestArtifactMutation)
    private readonly createPullRequestArtifactMutation: CreatePullRequestArtifactMutation =
      new CreatePullRequestArtifactMutation(),
    @inject(DeleteArtifactMutation)
    private readonly deleteArtifactMutation: DeleteArtifactMutation = new DeleteArtifactMutation(),
    @inject(UpdateArtifactMutation)
    private readonly updateArtifactMutation: UpdateArtifactMutation = new UpdateArtifactMutation(),
    @inject(UpdateMarkdownArtifactMutation)
    private readonly updateMarkdownArtifactMutation: UpdateMarkdownArtifactMutation =
      new UpdateMarkdownArtifactMutation(),
    @inject(UpdateExternalLinkArtifactMutation)
    private readonly updateExternalLinkArtifactMutation: UpdateExternalLinkArtifactMutation =
      new UpdateExternalLinkArtifactMutation(),
    @inject(ArchiveArtifactMutation)
    private readonly archiveArtifactMutation: ArchiveArtifactMutation = new ArchiveArtifactMutation(),
  ) {}

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        ArchiveArtifact: this.archiveArtifactMutation.execute,
        CreateExternalLinkArtifact: this.createExternalLinkArtifactMutation.execute,
        CreateMarkdownArtifact: this.createMarkdownArtifactMutation.execute,
        CreatePullRequestArtifact: this.createPullRequestArtifactMutation.execute,
        DeleteArtifact: this.deleteArtifactMutation.execute,
        UpdateArtifact: this.updateArtifactMutation.execute,
        UpdateExternalLinkArtifact: this.updateExternalLinkArtifactMutation.execute,
        UpdateMarkdownArtifact: this.updateMarkdownArtifactMutation.execute,
      },
      Query: {
        Artifact: this.artifactQueryResolver.execute,
        Artifacts: this.artifactsQueryResolver.execute,
      },
    };
  }
}
