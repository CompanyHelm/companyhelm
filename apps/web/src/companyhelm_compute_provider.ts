/**
 * Encapsulates the user-facing CompanyHelm compute provider rules so pages can consistently
 * recognize the seeded managed definition and present it as a CompanyHelm-owned backend instead of
 * exposing the underlying E2B implementation details.
 */
export class CompanyHelmComputeProvider {
  static readonly NAME = "CompanyHelm";

  static formatDefinitionOptionLabel(definition: {
    name: string;
    provider: string;
  }): string {
    if (CompanyHelmComputeProvider.isManagedDefinition(definition)) {
      return CompanyHelmComputeProvider.NAME;
    }

    return `${definition.name} • ${CompanyHelmComputeProvider.formatProviderLabel(definition)}`;
  }

  static formatProviderLabel(definition: {
    name?: string | null;
    provider: string;
  }): string {
    if (CompanyHelmComputeProvider.isManagedDefinition(definition)) {
      return CompanyHelmComputeProvider.NAME;
    }

    if (definition.provider === "e2b") {
      return "E2B";
    }
    if (definition.provider === "daytona") {
      return "Daytona";
    }

    return definition.provider;
  }

  static isManagedDefinition(definition: {
    name?: string | null;
    provider: string;
  }): boolean {
    return definition.provider === "e2b" && definition.name === CompanyHelmComputeProvider.NAME;
  }
}
