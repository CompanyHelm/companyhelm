/**
 * Centralizes the published CPU, memory, and disk envelopes for each compute provider type so the
 * UI can explain the standard planning ranges without duplicating provider-specific copy. These
 * values are informational only because both Daytona and E2B document that higher limits can be
 * arranged outside the default published ranges.
 */
export class ComputeProviderLimitsCatalog {
  private static readonly DAYTONA_LIMITS = {
    cpuRangeLabel: "1 to 4 vCPU",
    diskRangeLabel: "3 to 10 GiB",
    memoryRangeLabel: "1 to 8 GB",
  };

  private static readonly E2B_LIMITS = {
    cpuRangeLabel: "1 to 8 vCPU",
    diskRangeLabel: "10 to 20 GiB",
    memoryRangeLabel: "512 MiB to 8 GiB",
  };

  static formatCpuRange(provider: "daytona" | "e2b"): string {
    return ComputeProviderLimitsCatalog.getProviderLimits(provider).cpuRangeLabel;
  }

  static formatDiskRange(provider: "daytona" | "e2b"): string {
    return ComputeProviderLimitsCatalog.getProviderLimits(provider).diskRangeLabel;
  }

  static formatMemoryRange(provider: "daytona" | "e2b"): string {
    return ComputeProviderLimitsCatalog.getProviderLimits(provider).memoryRangeLabel;
  }

  static formatPublishedRangeSummary(provider: "daytona" | "e2b"): string {
    const limits = ComputeProviderLimitsCatalog.getProviderLimits(provider);
    return `CPU ${limits.cpuRangeLabel} • Memory ${limits.memoryRangeLabel} • Disk ${limits.diskRangeLabel}`;
  }

  static getPublishedRangeDisclaimer(): string {
    return "Ranges reflect the providers' published standard limits and can differ for enterprise or support-adjusted accounts.";
  }

  private static getProviderLimits(provider: "daytona" | "e2b") {
    return provider === "e2b"
      ? ComputeProviderLimitsCatalog.E2B_LIMITS
      : ComputeProviderLimitsCatalog.DAYTONA_LIMITS;
  }
}
