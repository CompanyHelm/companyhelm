import { and, eq } from "drizzle-orm";
import { Config } from "../../config/schema.ts";
import { OrganizationSlugResolver } from "../../auth/organization_slug_resolver.ts";
import { OrganizationSlugResolverFactory } from "../../auth/organization_slug_resolver_factory.ts";
import { agentSessions } from "../../db/schema.ts";
import { GithubClient } from "../../github/client.ts";
import { GithubInstallationStateService } from "../../github/installation_state_service.ts";
import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { AgentGithubInstallationService } from "../agent/session/pi-mono/tools/github/installation_service.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

type SessionOwnerRow = {
  ownerUserId: string | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<unknown[]>;
      };
    };
  };
};

/**
 * Exposes GitHub App installation management through the generic system_command bridge. Starting
 * an installation mints signed callback state for the current session; completion is handled by the
 * GraphQL callback mutation when GitHub redirects the user back into the app.
 */
export class GithubInstallationSystemCommandService {
  private readonly githubClient: GithubClient;
  private readonly githubInstallationStateService: GithubInstallationStateService;
  private readonly jsonSerializer = new SystemCommandJsonSerializer();
  private readonly organizationSlugResolver: OrganizationSlugResolver;

  constructor(
    githubClient: GithubClient = new GithubClient({} as Config),
    githubInstallationStateService: GithubInstallationStateService =
      new GithubInstallationStateService({} as Config),
    organizationSlugResolver: OrganizationSlugResolver =
      OrganizationSlugResolverFactory.create({} as Config),
  ) {
    this.githubClient = githubClient;
    this.githubInstallationStateService = githubInstallationStateService;
    this.organizationSlugResolver = organizationSlugResolver;
  }

  async execute(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    switch (commandId) {
      case "github.installation.list":
        return this.listInstallations(context);
      case "github.installation.start":
        return this.startInstallation(input, context);
      default:
        throw new Error(`System command ${commandId} is not handled by GitHub installation management.`);
    }
  }

  private async listInstallations(
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const service = new AgentGithubInstallationService(
      context.transactionProvider,
      context.companyId,
      this.githubClient,
    );

    return this.jsonSerializer.serializeRecord({
      installations: await service.listInstallations(),
    });
  }

  private async startInstallation(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    void input;
    const organizationSlug = await this.organizationSlugResolver.resolveForCompany(
      context.transactionProvider,
      context.companyId,
    );
    const returnPath = GithubInstallationSystemCommandService.createSourceSessionReturnPath(
      organizationSlug,
      context,
    );
    const sourceUserId = await this.loadSourceSessionUserId(context);
    const state = this.githubInstallationStateService.createState({
      companyId: context.companyId,
      organizationSlug,
      returnPath,
      sourceSessionId: context.sessionId,
      userId: sourceUserId,
    });

    return this.jsonSerializer.serializeRecord({
      installationUrl: this.githubClient.buildInstallationUrl(state),
      returnPath,
      sourceSessionId: context.sessionId,
      status: "waiting_for_user",
    });
  }

  private async loadSourceSessionUserId(context: SystemCommandExecutionContext): Promise<string> {
    const ownerUserId = await context.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [row] = await selectableDatabase
        .select({
          ownerUserId: agentSessions.ownerUserId,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, context.companyId),
          eq(agentSessions.id, context.sessionId),
        ))
        .limit(1) as SessionOwnerRow[];

      return row?.ownerUserId ?? null;
    });
    const normalizedOwnerUserId = String(ownerUserId || "").trim();
    if (!normalizedOwnerUserId) {
      throw new Error("The current session must be owned by a user before starting a GitHub installation.");
    }

    return normalizedOwnerUserId;
  }

  private static createSourceSessionReturnPath(
    organizationSlug: string,
    context: SystemCommandExecutionContext,
  ): string {
    const query = new URLSearchParams({
      agentId: context.agentId,
      sessionId: context.sessionId,
    });

    return `/orgs/${encodeURIComponent(organizationSlug)}/chats?${query.toString()}`;
  }
}
