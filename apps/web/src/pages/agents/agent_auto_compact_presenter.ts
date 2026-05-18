/**
 * Normalizes auto-compaction percentages for the agent settings UI so both create and edit flows
 * keep the same validation boundaries and display formatting.
 */
export class AgentAutoCompactPresenter {
  private static readonly defaultAutoCompactPercent = 80;

  static normalizePercent(value: number): number {
    if (!Number.isFinite(value)) {
      return AgentAutoCompactPresenter.defaultAutoCompactPercent;
    }

    return Math.min(100, Math.max(1, Math.trunc(value)));
  }
}
