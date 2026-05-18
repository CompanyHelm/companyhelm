import { SettingsManager } from "@mariozechner/pi-coding-agent";

/**
 * Builds PI Mono compaction settings from the agent's preferred auto-compaction percentage while
 * preserving PI Mono's minimum recent-context budget.
 */
export class PiMonoCompactionSettingsManagerFactory {
  private static readonly defaultAutoCompactPercent = 80;
  private static readonly defaultReserveTokens = 16_384;
  private static readonly minimumKeepRecentTokens = 20_000;

  create(
    contextWindowTokens: number | null | undefined,
    autoCompactPercent: number | null | undefined,
  ): SettingsManager {
    const normalizedContextWindowTokens = this.normalizeContextWindowTokens(contextWindowTokens);
    const normalizedAutoCompactPercent = this.normalizeAutoCompactPercent(autoCompactPercent);

    if (normalizedContextWindowTokens === null) {
      return SettingsManager.inMemory();
    }

    const agentThresholdTokens = Math.floor(
      normalizedContextWindowTokens * normalizedAutoCompactPercent / 100,
    );
    const piThresholdTokens = Math.max(
      0,
      normalizedContextWindowTokens - PiMonoCompactionSettingsManagerFactory.defaultReserveTokens,
    );
    const effectiveThresholdTokens = Math.max(
      PiMonoCompactionSettingsManagerFactory.minimumKeepRecentTokens,
      Math.min(agentThresholdTokens, piThresholdTokens),
    );
    const reserveTokens = Math.max(
      0,
      normalizedContextWindowTokens - effectiveThresholdTokens,
    );

    return SettingsManager.inMemory({
      compaction: {
        enabled: true,
        keepRecentTokens: PiMonoCompactionSettingsManagerFactory.minimumKeepRecentTokens,
        reserveTokens,
      },
    });
  }

  private normalizeAutoCompactPercent(value: number | null | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return PiMonoCompactionSettingsManagerFactory.defaultAutoCompactPercent;
    }

    return Math.min(100, Math.max(1, Math.trunc(value)));
  }

  private normalizeContextWindowTokens(value: number | null | undefined): number | null {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return null;
    }

    return Math.trunc(value);
  }
}
