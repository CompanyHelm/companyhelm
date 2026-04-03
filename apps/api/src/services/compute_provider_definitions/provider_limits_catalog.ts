import type { AgentEnvironmentRequirements, ComputeProvider } from "../agent/compute/provider_interface.ts";

/**
 * Defines the standard published compute envelopes for each provider so API mutations can reject
 * agent requirements that exceed what the selected backend normally advertises.
 */
export class ComputeProviderLimitsCatalog {
  private static readonly DAYTONA_LIMITS = {
    maxCpuCount: 4,
    maxDiskSpaceGb: 10,
    maxMemoryGb: 8,
    minCpuCount: 1,
    minDiskSpaceGb: 3,
    minMemoryGb: 1,
    providerLabel: "Daytona",
  };

  private static readonly E2B_LIMITS = {
    maxCpuCount: 8,
    maxDiskSpaceGb: 20,
    maxMemoryGb: 8,
    minCpuCount: 1,
    minDiskSpaceGb: 10,
    minMemoryGb: 1,
    providerLabel: "E2B",
  };

  static validateRequirements(
    provider: ComputeProvider,
    requirements: AgentEnvironmentRequirements,
  ): void {
    const limits = ComputeProviderLimitsCatalog.getProviderLimits(provider);

    ComputeProviderLimitsCatalog.validatePositiveInteger("minCpuCount", requirements.minCpuCount);
    ComputeProviderLimitsCatalog.validatePositiveInteger("minMemoryGb", requirements.minMemoryGb);
    ComputeProviderLimitsCatalog.validatePositiveInteger("minDiskSpaceGb", requirements.minDiskSpaceGb);

    if (requirements.minCpuCount < limits.minCpuCount || requirements.minCpuCount > limits.maxCpuCount) {
      throw new Error(
        `CPU must be between ${limits.minCpuCount} and ${limits.maxCpuCount} for ${limits.providerLabel}.`,
      );
    }
    if (requirements.minMemoryGb < limits.minMemoryGb || requirements.minMemoryGb > limits.maxMemoryGb) {
      throw new Error(
        `Memory must be between ${limits.minMemoryGb} and ${limits.maxMemoryGb} GB for ${limits.providerLabel}.`,
      );
    }
    if (
      requirements.minDiskSpaceGb < limits.minDiskSpaceGb
      || requirements.minDiskSpaceGb > limits.maxDiskSpaceGb
    ) {
      throw new Error(
        `Disk must be between ${limits.minDiskSpaceGb} and ${limits.maxDiskSpaceGb} GB for ${limits.providerLabel}.`,
      );
    }
  }

  private static getProviderLimits(provider: ComputeProvider) {
    return provider === "e2b"
      ? ComputeProviderLimitsCatalog.E2B_LIMITS
      : ComputeProviderLimitsCatalog.DAYTONA_LIMITS;
  }

  private static validatePositiveInteger(fieldName: string, value: number): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${fieldName} must be a positive integer.`);
    }
  }
}
