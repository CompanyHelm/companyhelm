/**
 * Centralizes the published CPU, memory, and disk envelopes for each compute provider type so the
 * UI can explain and validate against the standard published ranges without duplicating
 * provider-specific limits across forms and detail views.
 */
export class ComputeProviderLimitsCatalog {
  private static readonly E2B_LIMITS = {
    maxCpuCount: 8,
    maxDiskSpaceGb: 20,
    maxMemoryGb: 8,
    cpuRangeLabel: "1 to 8 vCPU",
    diskRangeLabel: "10 to 20 GiB",
    memoryRangeLabel: "512 MiB to 8 GiB",
    minCpuCount: 1,
    minDiskSpaceGb: 10,
    minMemoryGb: 1,
    providerLabel: "E2B",
  };

  static formatCpuRange(): string {
    return ComputeProviderLimitsCatalog.E2B_LIMITS.cpuRangeLabel;
  }

  static formatDiskRange(): string {
    return ComputeProviderLimitsCatalog.E2B_LIMITS.diskRangeLabel;
  }

  static formatMemoryRange(): string {
    return ComputeProviderLimitsCatalog.E2B_LIMITS.memoryRangeLabel;
  }

  static formatPublishedRangeSummary(): string {
    const limits = ComputeProviderLimitsCatalog.E2B_LIMITS;
    return `CPU ${limits.cpuRangeLabel} • Memory ${limits.memoryRangeLabel} • Disk ${limits.diskRangeLabel}`;
  }

  static getCpuBounds(): {
    max: number;
    min: number;
  } {
    const limits = ComputeProviderLimitsCatalog.E2B_LIMITS;
    return {
      max: limits.maxCpuCount,
      min: limits.minCpuCount,
    };
  }

  static getDiskBounds(): {
    max: number;
    min: number;
  } {
    const limits = ComputeProviderLimitsCatalog.E2B_LIMITS;
    return {
      max: limits.maxDiskSpaceGb,
      min: limits.minDiskSpaceGb,
    };
  }

  static getMemoryBounds(): {
    max: number;
    min: number;
  } {
    const limits = ComputeProviderLimitsCatalog.E2B_LIMITS;
    return {
      max: limits.maxMemoryGb,
      min: limits.minMemoryGb,
    };
  }

  static getValidationMessage(
    requirements: {
      minCpuCount: number;
      minDiskSpaceGb: number;
      minMemoryGb: number;
    },
  ): string | null {
    const limits = ComputeProviderLimitsCatalog.E2B_LIMITS;

    if (requirements.minCpuCount < limits.minCpuCount || requirements.minCpuCount > limits.maxCpuCount) {
      return `CPU must be between ${limits.minCpuCount} and ${limits.maxCpuCount} for ${limits.providerLabel}.`;
    }
    if (requirements.minMemoryGb < limits.minMemoryGb || requirements.minMemoryGb > limits.maxMemoryGb) {
      return `Memory must be between ${limits.minMemoryGb} and ${limits.maxMemoryGb} GB for ${limits.providerLabel}.`;
    }
    if (
      requirements.minDiskSpaceGb < limits.minDiskSpaceGb
      || requirements.minDiskSpaceGb > limits.maxDiskSpaceGb
    ) {
      return `Disk must be between ${limits.minDiskSpaceGb} and ${limits.maxDiskSpaceGb} GB for ${limits.providerLabel}.`;
    }

    return null;
  }

  static getPublishedRangeDisclaimer(): string {
    return "Validation uses the providers' published standard ranges. Enterprise or support-adjusted accounts may need broader limits than the app currently allows.";
  }
}
