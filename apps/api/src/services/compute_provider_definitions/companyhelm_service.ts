import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import type { ComputeProvider } from "../agent/compute/provider_interface.ts";
import type { RuntimeComputeProviderDefinition } from "./service.ts";

/**
 * Centralizes the CompanyHelm-managed compute provider identity and the config-backed E2B
 * credentials that power it. Other services use this class to keep the reserved row behavior and
 * runtime wiring consistent across auth bootstrap, GraphQL, and environment provisioning.
 */
@injectable()
export class CompanyHelmComputeProviderService {
  static readonly DEFINITION_DESCRIPTION = "Managed by CompanyHelm";
  static readonly DEFINITION_NAME = "CompanyHelm";
  private readonly config: Config;

  constructor(@inject(Config) config: Config) {
    this.config = config;
  }

  getDefinitionDescription(): string {
    return CompanyHelmComputeProviderService.DEFINITION_DESCRIPTION;
  }

  getDefinitionName(): string {
    return CompanyHelmComputeProviderService.DEFINITION_NAME;
  }

  getProvider(): "e2b" {
    return "e2b";
  }

  hasConfiguredApiKey(): boolean {
    return this.config.companyhelm.e2b.api_key.length > 0;
  }

  isReservedName(name: string): boolean {
    return name === CompanyHelmComputeProviderService.DEFINITION_NAME;
  }

  matchesDefinition(definition: {
    name: string;
    provider: ComputeProvider;
  }): boolean {
    return definition.provider === "e2b"
      && definition.name === CompanyHelmComputeProviderService.DEFINITION_NAME;
  }

  createRuntimeDefinition(params: {
    companyId: string;
    description: string | null;
    id: string;
  }): RuntimeComputeProviderDefinition {
    return {
      apiKey: this.config.companyhelm.e2b.api_key,
      companyId: params.companyId,
      description: params.description,
      id: params.id,
      name: CompanyHelmComputeProviderService.DEFINITION_NAME,
      provider: "e2b",
    };
  }
}
