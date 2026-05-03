export type EnvironmentMetricWindowRange = {
  endTime: string;
  startTime: string;
};

/**
 * Builds the fixed time range used by the environment metrics tab query so Relay receives a stable
 * set of variables while the Suspense boundary is waiting for the first response.
 */
export class EnvironmentMetricWindow {
  static createLastHour(endTime: Date = new Date()): EnvironmentMetricWindowRange {
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
    return {
      endTime: endTime.toISOString(),
      startTime: startTime.toISOString(),
    };
  }
}
