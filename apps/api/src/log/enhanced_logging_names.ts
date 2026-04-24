import { injectable } from "inversify";

/**
 * Owns the Redis key and pub/sub naming contract for runtime enhanced logging toggles. The values
 * live outside company-scoped Redis prefixes because workers need to inspect a target company's
 * diagnostics policy before deciding whether to emit extra logs for that company.
 */
@injectable()
export class EnhancedLoggingNames {
  getCompanyConfigKey(companyId: string): string {
    return `runtime:enhanced-logging:company:${companyId}`;
  }

  getInvalidationChannel(): string {
    return "runtime:enhanced-logging:update";
  }
}
