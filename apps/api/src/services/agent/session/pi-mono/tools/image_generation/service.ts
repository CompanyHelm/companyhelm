import { and, eq } from "drizzle-orm";
import { agents, imageProviderCredentialModels, modelProviderCredentials } from "../../../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import { CompanyHelmLlmProviderService } from "../../../../../ai_providers/companyhelm_service.ts";
import { ImageGenerationProviderModel } from "../../../../../ai_providers/image_generation/model.ts";
import { ImageGenerationProviderService } from "../../../../../ai_providers/image_generation/provider_service.ts";

export type AgentImageGenerationToolResult = {
  base64Image: string;
  mimeType: string;
  modelId: string;
  modelName: string;
  providerId: string;
  revisedPrompt: string | null;
};

type AgentRow = { defaultImageProviderCredentialModelId: string | null };
type ImageModelRow = {
  description: string;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  outputMimeTypes: string[];
  supportedQualities: string[];
  supportedSizes: string[];
  supportsEditing: boolean;
  supportsFlexibleSizes: boolean;
  supportsTransparentBackground: boolean;
};
type CredentialRow = {
  baseUrl: string | null;
  encryptedApiKey: string;
  isManaged: boolean;
  modelProvider: string;
};
type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Resolves the current agent's configured image model and credential, validates common input
 * options, and delegates provider-specific execution to the shared image generation adapters.
 */
export class AgentImageGenerationToolService {
  private readonly agentId: string;
  private readonly companyId: string;
  private readonly companyHelmLlmProviderService?: CompanyHelmLlmProviderService;
  private readonly imageGenerationProviderService: ImageGenerationProviderService;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    imageGenerationProviderService: ImageGenerationProviderService,
    companyHelmLlmProviderService?: CompanyHelmLlmProviderService,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.agentId = agentId;
    this.imageGenerationProviderService = imageGenerationProviderService;
    this.companyHelmLlmProviderService = companyHelmLlmProviderService;
  }

  async hasConfiguredImageModel(): Promise<boolean> {
    const assignment = await this.loadAssignment();
    return assignment !== null;
  }

  async generateImage(input: {
    background?: "auto" | "opaque" | "transparent";
    outputFormat?: "jpeg" | "png" | "webp";
    prompt: string;
    quality?: "auto" | "high" | "low" | "medium";
    size?: string;
  }): Promise<AgentImageGenerationToolResult> {
    const assignment = await this.loadAssignment();
    if (!assignment) {
      throw new Error("This agent does not have a default image generation model assigned.");
    }

    this.validateRequest(input, assignment.model);
    const apiKey = assignment.credential.isManaged
      ? this.requireCompanyHelmLlmProviderService().getRuntimeApiKey()
      : assignment.credential.encryptedApiKey;
    const result = await this.imageGenerationProviderService.generateImage({
      apiKey,
      baseUrl: assignment.credential.baseUrl,
      model: assignment.model,
      request: input,
    });

    return {
      base64Image: result.base64Image,
      mimeType: result.mimeType,
      modelId: assignment.model.modelId,
      modelName: assignment.model.name,
      providerId: result.providerId,
      revisedPrompt: result.revisedPrompt,
    };
  }

  private async loadAssignment(): Promise<{ credential: CredentialRow; model: ImageGenerationProviderModel } | null> {
    return this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [agentRow] = await selectableDatabase
        .select({ defaultImageProviderCredentialModelId: agents.defaultImageProviderCredentialModelId })
        .from(agents)
        .where(and(eq(agents.companyId, this.companyId), eq(agents.id, this.agentId))) as AgentRow[];
      if (!agentRow?.defaultImageProviderCredentialModelId) {
        return null;
      }

      const [imageModelRow] = await selectableDatabase
        .select({
          description: imageProviderCredentialModels.description,
          modelId: imageProviderCredentialModels.modelId,
          modelProviderCredentialId: imageProviderCredentialModels.modelProviderCredentialId,
          name: imageProviderCredentialModels.name,
          outputMimeTypes: imageProviderCredentialModels.outputMimeTypes,
          supportedQualities: imageProviderCredentialModels.supportedQualities,
          supportedSizes: imageProviderCredentialModels.supportedSizes,
          supportsEditing: imageProviderCredentialModels.supportsEditing,
          supportsFlexibleSizes: imageProviderCredentialModels.supportsFlexibleSizes,
          supportsTransparentBackground: imageProviderCredentialModels.supportsTransparentBackground,
        })
        .from(imageProviderCredentialModels)
        .where(and(
          eq(imageProviderCredentialModels.companyId, this.companyId),
          eq(imageProviderCredentialModels.id, agentRow.defaultImageProviderCredentialModelId),
        )) as ImageModelRow[];
      if (!imageModelRow) {
        return null;
      }

      const [credentialRow] = await selectableDatabase
        .select({
          baseUrl: modelProviderCredentials.baseUrl,
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
          isManaged: modelProviderCredentials.isManaged,
          modelProvider: modelProviderCredentials.modelProvider,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, this.companyId),
          eq(modelProviderCredentials.id, imageModelRow.modelProviderCredentialId),
        )) as CredentialRow[];
      if (!credentialRow) {
        return null;
      }

      return {
        credential: credentialRow,
        model: new ImageGenerationProviderModel({
          description: imageModelRow.description,
          modelId: imageModelRow.modelId,
          name: imageModelRow.name,
          outputMimeTypes: imageModelRow.outputMimeTypes,
          provider: credentialRow.modelProvider,
          supportedQualities: imageModelRow.supportedQualities,
          supportedSizes: imageModelRow.supportedSizes,
          supportsEditing: imageModelRow.supportsEditing,
          supportsFlexibleSizes: imageModelRow.supportsFlexibleSizes,
          supportsTransparentBackground: imageModelRow.supportsTransparentBackground,
        }),
      };
    });
  }

  private requireCompanyHelmLlmProviderService(): CompanyHelmLlmProviderService {
    if (!this.companyHelmLlmProviderService) {
      throw new Error("CompanyHelm model provider service is not configured.");
    }

    return this.companyHelmLlmProviderService;
  }

  private validateRequest(input: { background?: "auto" | "opaque" | "transparent"; outputFormat?: "jpeg" | "png" | "webp"; prompt: string; quality?: "auto" | "high" | "low" | "medium"; size?: string }, model: ImageGenerationProviderModel): void {
    if (!input.prompt.trim()) {
      throw new Error("prompt is required.");
    }
    if (input.background === "transparent" && !model.supportsTransparentBackground) {
      throw new Error(`${model.name} does not support transparent backgrounds.`);
    }
    if (input.quality && !model.supportedQualities.includes(input.quality)) {
      throw new Error(`${input.quality} is not supported by ${model.name}.`);
    }
    if (input.size && !model.supportsFlexibleSizes && !model.supportedSizes.includes(input.size)) {
      throw new Error(`${input.size} is not supported by ${model.name}.`);
    }
    if (input.outputFormat && !model.outputMimeTypes.includes(AgentImageGenerationToolService.toMimeType(input.outputFormat))) {
      throw new Error(`${input.outputFormat} output is not supported by ${model.name}.`);
    }
  }

  private static toMimeType(outputFormat: "jpeg" | "png" | "webp"): string {
    if (outputFormat === "jpeg") {
      return "image/jpeg";
    }
    if (outputFormat === "webp") {
      return "image/webp";
    }
    return "image/png";
  }
}
