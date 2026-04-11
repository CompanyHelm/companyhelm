import { inject, injectable } from "inversify";
import { AgentEnvironmentTemplateService } from "../../services/environments/template_service.ts";
import { AddComputeProviderDefinitionMutation } from "../mutations/add_compute_provider_definition.ts";
import { AddModelProviderCredentialMutation } from "../mutations/add_model_provider_credential.ts";
import { DeleteComputeProviderDefinitionMutation } from "../mutations/delete_compute_provider_definition.ts";
import { DeleteEnvironmentMutation } from "../mutations/delete_environment.ts";
import { DeleteModelProviderCredentialMutation } from "../mutations/delete_model_provider_credential.ts";
import { GetEnvironmentVncUrlMutation } from "../mutations/get_environment_vnc_url.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../mutations/refresh_model_provider_credential_models.ts";
import { RefreshModelProviderCredentialTokenMutation } from "../mutations/refresh_model_provider_credential_token.ts";
import { SetDefaultComputeProviderDefinitionMutation } from "../mutations/set_default_compute_provider_definition.ts";
import { SetDefaultModelProviderCredentialMutation } from "../mutations/set_default_model_provider_credential.ts";
import { SetDefaultModelProviderCredentialModelMutation } from "../mutations/set_default_model_provider_credential_model.ts";
import { StartEnvironmentMutation } from "../mutations/start_environment.ts";
import { StopEnvironmentMutation } from "../mutations/stop_environment.ts";
import { UpdateComputeProviderDefinitionMutation } from "../mutations/update_compute_provider_definition.ts";
import { ComputeProviderDefinitionTemplatesResolver } from "../resolvers/compute_provider_definition_templates.ts";
import { ComputeProviderDefinitionsQueryResolver } from "../resolvers/compute_provider_definitions.ts";
import { EnvironmentsQueryResolver } from "../resolvers/environments.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "../resolvers/model_providers.ts";
import { SessionEnvironmentQueryResolver } from "../resolvers/session_environment.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

type EnvironmentsQueryResolverLike = {
  execute: (...arguments_: unknown[]) => unknown;
};

type MutationLike = {
  execute: (...arguments_: unknown[]) => unknown;
};

/**
 * Encapsulates environment lifecycle and compute/model provider GraphQL wiring so provider-related
 * mutations stay together and away from the transport bootstrap.
 */
@injectable()
export class EnvironmentGraphqlRegistry implements GraphqlRegistryInterface {
  private readonly addComputeProviderDefinitionMutation: AddComputeProviderDefinitionMutation;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly computeProviderDefinitionsQueryResolver: ComputeProviderDefinitionsQueryResolver;
  private readonly computeProviderDefinitionTemplatesResolver: ComputeProviderDefinitionTemplatesResolver;
  private readonly deleteComputeProviderDefinitionMutation: DeleteComputeProviderDefinitionMutation;
  private deleteEnvironmentMutation: MutationLike;
  private readonly deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation;
  private environmentsQueryResolver: EnvironmentsQueryResolverLike;
  private getEnvironmentVncUrlMutation: MutationLike;
  private readonly modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver;
  private readonly modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver;
  private readonly modelProvidersQueryResolver: ModelProvidersQueryResolver;
  private readonly refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation;
  private readonly refreshModelProviderCredentialTokenMutation: RefreshModelProviderCredentialTokenMutation;
  private readonly sessionEnvironmentQueryResolver: SessionEnvironmentQueryResolver;
  private readonly setDefaultComputeProviderDefinitionMutation: SetDefaultComputeProviderDefinitionMutation;
  private readonly setDefaultModelProviderCredentialMutation: SetDefaultModelProviderCredentialMutation;
  private readonly setDefaultModelProviderCredentialModelMutation: SetDefaultModelProviderCredentialModelMutation;
  private startEnvironmentMutation: MutationLike;
  private stopEnvironmentMutation: MutationLike;
  private readonly updateComputeProviderDefinitionMutation: UpdateComputeProviderDefinitionMutation;

  constructor(
    @inject(AddModelProviderCredentialMutation)
    addModelProviderCredentialMutation: AddModelProviderCredentialMutation,
    @inject(DeleteModelProviderCredentialMutation)
    deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation =
      new DeleteModelProviderCredentialMutation(),
    @inject(RefreshModelProviderCredentialModelsMutation)
    refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation,
    @inject(ModelProviderCredentialModelsQueryResolver)
    modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver =
      new ModelProviderCredentialModelsQueryResolver(),
    @inject(ModelProviderCredentialsQueryResolver)
    modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver =
      new ModelProviderCredentialsQueryResolver(),
    @inject(DeleteEnvironmentMutation)
    deleteEnvironmentMutation: DeleteEnvironmentMutation = new DeleteEnvironmentMutation(),
    @inject(StartEnvironmentMutation)
    startEnvironmentMutation: StartEnvironmentMutation = new StartEnvironmentMutation(),
    @inject(StopEnvironmentMutation)
    stopEnvironmentMutation: StopEnvironmentMutation = new StopEnvironmentMutation(),
    @inject(ModelProvidersQueryResolver)
    modelProvidersQueryResolver: ModelProvidersQueryResolver = new ModelProvidersQueryResolver(),
    @inject(AddComputeProviderDefinitionMutation)
    addComputeProviderDefinitionMutation: AddComputeProviderDefinitionMutation = {
      async execute() {
        throw new Error("AddComputeProviderDefinition mutation is not configured.");
      },
    } as never,
    @inject(DeleteComputeProviderDefinitionMutation)
    deleteComputeProviderDefinitionMutation: DeleteComputeProviderDefinitionMutation = {
      async execute() {
        throw new Error("DeleteComputeProviderDefinition mutation is not configured.");
      },
    } as never,
    @inject(UpdateComputeProviderDefinitionMutation)
    updateComputeProviderDefinitionMutation: UpdateComputeProviderDefinitionMutation = {
      async execute() {
        throw new Error("UpdateComputeProviderDefinition mutation is not configured.");
      },
    } as never,
    @inject(ComputeProviderDefinitionsQueryResolver)
    computeProviderDefinitionsQueryResolver: ComputeProviderDefinitionsQueryResolver = {
      async execute() {
        throw new Error("ComputeProviderDefinitions query is not configured.");
      },
    } as never,
    @inject(SessionEnvironmentQueryResolver)
    sessionEnvironmentQueryResolver: SessionEnvironmentQueryResolver = {
      async execute() {
        throw new Error("SessionEnvironment query is not configured.");
      },
    } as never,
    @inject(EnvironmentsQueryResolver)
    environmentsQueryResolver: EnvironmentsQueryResolver = new EnvironmentsQueryResolver(),
    @inject(AgentEnvironmentTemplateService)
    agentEnvironmentTemplateService?: AgentEnvironmentTemplateService,
    @inject(ComputeProviderDefinitionTemplatesResolver)
    computeProviderDefinitionTemplatesResolver?: ComputeProviderDefinitionTemplatesResolver,
    @inject(GetEnvironmentVncUrlMutation)
    getEnvironmentVncUrlMutation: GetEnvironmentVncUrlMutation = new GetEnvironmentVncUrlMutation(),
    @inject(SetDefaultComputeProviderDefinitionMutation)
    setDefaultComputeProviderDefinitionMutation: SetDefaultComputeProviderDefinitionMutation = {
      async execute() {
        throw new Error("SetDefaultComputeProviderDefinition mutation is not configured.");
      },
    } as never,
    @inject(SetDefaultModelProviderCredentialMutation)
    setDefaultModelProviderCredentialMutation: SetDefaultModelProviderCredentialMutation = {
      async execute() {
        throw new Error("SetDefaultModelProviderCredential mutation is not configured.");
      },
    } as never,
    @inject(RefreshModelProviderCredentialTokenMutation)
    refreshModelProviderCredentialTokenMutation: RefreshModelProviderCredentialTokenMutation = {
      async execute() {
        throw new Error("RefreshModelProviderCredentialToken mutation is not configured.");
      },
    } as never,
    @inject(SetDefaultModelProviderCredentialModelMutation)
    setDefaultModelProviderCredentialModelMutation: SetDefaultModelProviderCredentialModelMutation = {
      async execute() {
        throw new Error("SetDefaultModelProviderCredentialModel mutation is not configured.");
      },
    } as never,
  ) {
    const defaultAgentEnvironmentTemplateService = agentEnvironmentTemplateService
      ?? EnvironmentGraphqlRegistry.createFallbackAgentEnvironmentTemplateService();

    this.addComputeProviderDefinitionMutation = addComputeProviderDefinitionMutation;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.computeProviderDefinitionsQueryResolver = computeProviderDefinitionsQueryResolver;
    this.computeProviderDefinitionTemplatesResolver = computeProviderDefinitionTemplatesResolver
      ?? new ComputeProviderDefinitionTemplatesResolver(defaultAgentEnvironmentTemplateService);
    this.deleteComputeProviderDefinitionMutation = deleteComputeProviderDefinitionMutation;
    this.deleteEnvironmentMutation = deleteEnvironmentMutation;
    this.deleteModelProviderCredentialMutation = deleteModelProviderCredentialMutation;
    this.environmentsQueryResolver = environmentsQueryResolver;
    this.getEnvironmentVncUrlMutation = getEnvironmentVncUrlMutation;
    this.modelProviderCredentialModelsQueryResolver = modelProviderCredentialModelsQueryResolver;
    this.modelProviderCredentialsQueryResolver = modelProviderCredentialsQueryResolver;
    this.modelProvidersQueryResolver = modelProvidersQueryResolver;
    this.refreshModelProviderCredentialModelsMutation = refreshModelProviderCredentialModelsMutation;
    this.refreshModelProviderCredentialTokenMutation = refreshModelProviderCredentialTokenMutation;
    this.sessionEnvironmentQueryResolver = sessionEnvironmentQueryResolver;
    this.setDefaultComputeProviderDefinitionMutation = setDefaultComputeProviderDefinitionMutation;
    this.setDefaultModelProviderCredentialMutation = setDefaultModelProviderCredentialMutation;
    this.setDefaultModelProviderCredentialModelMutation = setDefaultModelProviderCredentialModelMutation;
    this.startEnvironmentMutation = startEnvironmentMutation;
    this.stopEnvironmentMutation = stopEnvironmentMutation;
    this.updateComputeProviderDefinitionMutation = updateComputeProviderDefinitionMutation;
  }

  createResolvers(): GraphqlResolverFragment {
    return {
      ComputeProviderDefinition: {
        templates: this.computeProviderDefinitionTemplatesResolver.execute,
      },
      Mutation: {
        AddComputeProviderDefinition: this.addComputeProviderDefinitionMutation.execute,
        AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
        DeleteComputeProviderDefinition: this.deleteComputeProviderDefinitionMutation.execute,
        DeleteEnvironment: this.deleteEnvironmentMutation.execute,
        DeleteModelProviderCredential: this.deleteModelProviderCredentialMutation.execute,
        GetEnvironmentVncUrl: this.getEnvironmentVncUrlMutation.execute,
        RefreshModelProviderCredentialModels: this.refreshModelProviderCredentialModelsMutation.execute,
        RefreshModelProviderCredentialToken: this.refreshModelProviderCredentialTokenMutation.execute,
        SetDefaultComputeProviderDefinition: this.setDefaultComputeProviderDefinitionMutation.execute,
        SetDefaultModelProviderCredential: this.setDefaultModelProviderCredentialMutation.execute,
        SetDefaultModelProviderCredentialModel: this.setDefaultModelProviderCredentialModelMutation.execute,
        StartEnvironment: this.startEnvironmentMutation.execute,
        StopEnvironment: this.stopEnvironmentMutation.execute,
        UpdateComputeProviderDefinition: this.updateComputeProviderDefinitionMutation.execute,
      },
      Query: {
        ComputeProviderDefinitions: this.computeProviderDefinitionsQueryResolver.execute,
        Environments: this.environmentsQueryResolver.execute,
        ModelProviderCredentialModels: this.modelProviderCredentialModelsQueryResolver.execute,
        ModelProviderCredentials: this.modelProviderCredentialsQueryResolver.execute,
        ModelProviders: this.modelProvidersQueryResolver.execute,
        SessionEnvironment: this.sessionEnvironmentQueryResolver.execute,
      },
    };
  }

  getDeleteEnvironmentMutation(): MutationLike {
    return this.deleteEnvironmentMutation;
  }

  setDeleteEnvironmentMutation(deleteEnvironmentMutation: MutationLike): void {
    this.deleteEnvironmentMutation = deleteEnvironmentMutation;
  }

  getEnvironmentsQueryResolver(): EnvironmentsQueryResolverLike {
    return this.environmentsQueryResolver;
  }

  setEnvironmentsQueryResolver(environmentsQueryResolver: EnvironmentsQueryResolverLike): void {
    this.environmentsQueryResolver = environmentsQueryResolver;
  }

  getGetEnvironmentVncUrlMutation(): MutationLike {
    return this.getEnvironmentVncUrlMutation;
  }

  setGetEnvironmentVncUrlMutation(getEnvironmentVncUrlMutation: MutationLike): void {
    this.getEnvironmentVncUrlMutation = getEnvironmentVncUrlMutation;
  }

  getStartEnvironmentMutation(): MutationLike {
    return this.startEnvironmentMutation;
  }

  setStartEnvironmentMutation(startEnvironmentMutation: MutationLike): void {
    this.startEnvironmentMutation = startEnvironmentMutation;
  }

  getStopEnvironmentMutation(): MutationLike {
    return this.stopEnvironmentMutation;
  }

  setStopEnvironmentMutation(stopEnvironmentMutation: MutationLike): void {
    this.stopEnvironmentMutation = stopEnvironmentMutation;
  }

  private static createFallbackAgentEnvironmentTemplateService(): AgentEnvironmentTemplateService {
    return {
      async getAgentTemplate() {
        return {
          computerUse: true,
          cpuCount: 4,
          diskSpaceGb: 10,
          memoryGb: 8,
          name: "Desktop",
          templateId: "e2b/desktop",
        };
      },
      async listTemplatesForProvider() {
        return [{
          computerUse: true,
          cpuCount: 4,
          diskSpaceGb: 10,
          memoryGb: 8,
          name: "Desktop",
          templateId: "e2b/desktop",
        }];
      },
      async resolveTemplateForProvider(_transactionProvider: unknown, input: { templateId: string }) {
        if (input.templateId === "e2b/desktop") {
          return {
            computerUse: true,
            cpuCount: 4,
            diskSpaceGb: 10,
            memoryGb: 8,
            name: "Desktop",
            templateId: input.templateId,
          };
        }

        return {
          computerUse: false,
          cpuCount: 4,
          diskSpaceGb: 10,
          memoryGb: 8,
          name: "Default",
          templateId: input.templateId,
        };
      },
    } as never;
  }
}
