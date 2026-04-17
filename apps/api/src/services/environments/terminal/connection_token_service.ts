import { randomUUID } from "node:crypto";
import { injectable } from "inversify";

export type EnvironmentTerminalConnectionGrant = {
  columns: number;
  companyId: string;
  environmentId: string;
  expiresAt: Date;
  rows: number;
  terminalSessionId: string;
  userId: string;
};

/**
 * Issues short-lived one-time websocket grants after GraphQL has already performed normal company
 * authorization. Browser websocket clients cannot send Authorization headers, so this service
 * keeps those bearer tokens out of URLs while still binding each websocket to one environment.
 */
@injectable()
export class EnvironmentTerminalConnectionTokenService {
  private static readonly DEFAULT_TIME_TO_LIVE_MILLISECONDS = 60_000;
  private readonly grantsByToken = new Map<string, EnvironmentTerminalConnectionGrant>();

  createGrant(input: Omit<EnvironmentTerminalConnectionGrant, "expiresAt">): {
    expiresAt: Date;
    token: string;
  } {
    this.deleteExpiredGrants();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + EnvironmentTerminalConnectionTokenService.DEFAULT_TIME_TO_LIVE_MILLISECONDS);
    this.grantsByToken.set(token, {
      ...input,
      expiresAt,
    });

    return {
      expiresAt,
      token,
    };
  }

  consumeGrant(token: string): EnvironmentTerminalConnectionGrant | null {
    this.deleteExpiredGrants();
    const grant = this.grantsByToken.get(token);
    if (!grant) {
      return null;
    }

    this.grantsByToken.delete(token);
    if (grant.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return grant;
  }

  private deleteExpiredGrants(): void {
    const now = Date.now();
    for (const [token, grant] of this.grantsByToken.entries()) {
      if (grant.expiresAt.getTime() <= now) {
        this.grantsByToken.delete(token);
      }
    }
  }
}
