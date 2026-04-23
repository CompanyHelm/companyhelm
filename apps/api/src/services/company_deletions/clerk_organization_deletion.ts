import { createClerkClient } from "@clerk/backend";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";

type ClerkClientDependency = {
  organizations: {
    deleteOrganization(organizationId: string): Promise<unknown>;
  };
};

/**
 * Handles the Clerk-side organization removal for an app-initiated company deletion. It treats an
 * already-missing organization as success so retries remain idempotent after a partial cleanup.
 */
@injectable()
export class ClerkOrganizationDeletionService {
  private clerkClient: ClerkClientDependency | null = null;

  constructor(@inject(Config) config: Config) {
    if (config.auth.provider === "clerk") {
      this.clerkClient = createClerkClient({
        publishableKey: config.auth.clerk.publishable_key,
        secretKey: config.auth.clerk.secret_key,
      }) as unknown as ClerkClientDependency;
    }
  }

  static createForTest(clerkClient: ClerkClientDependency): ClerkOrganizationDeletionService {
    const service = new ClerkOrganizationDeletionService({
      auth: {
        clerk: {
          authorized_parties: ["http://localhost"],
          jwks_url: "http://localhost/.well-known/jwks.json",
          publishable_key: "pk_test_local",
          secret_key: "sk_test_local",
        },
        provider: "clerk",
      },
    } as Config);
    service.clerkClient = clerkClient;
    return service;
  }

  async deleteOrganization(organizationId: string | null): Promise<void> {
    if (!this.clerkClient || !organizationId) {
      return;
    }

    try {
      await this.clerkClient.organizations.deleteOrganization(organizationId);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return;
      }

      throw error;
    }
  }

  private isNotFoundError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
      return false;
    }

    const maybeStatusError = error as {
      status?: unknown;
      statusCode?: unknown;
    };
    return maybeStatusError.status === 404 || maybeStatusError.statusCode === 404;
  }
}
