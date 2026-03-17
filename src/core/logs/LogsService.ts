import {
  AVAILABLE_MANAGED_SERVICE_NAMES,
  resolveManagedServiceKey,
  type ManagedServiceKey
} from "../services/ManagedServiceNames.js";

export class LogsService {
  public constructor(private readonly streamServiceLogs: (service: ManagedServiceKey) => Promise<void>) {}

  public async stream(service: string): Promise<void> {
    const resolvedService = resolveManagedServiceKey(service);
    if (!resolvedService) {
      throw new Error(`Unknown service '${service}'. Expected one of: ${AVAILABLE_MANAGED_SERVICE_NAMES.join(", ")}`);
    }

    await this.streamServiceLogs(resolvedService);
  }
}
