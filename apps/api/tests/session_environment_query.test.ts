import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionEnvironmentQueryResolver } from "../src/graphql/resolvers/session_environment.ts";

test("SessionEnvironmentQueryResolver includes active session skills", async () => {
  const listActiveSkillsCalls: Array<{ companyId: string; sessionId: string }> = [];
  const resolver = new SessionEnvironmentQueryResolver(
    {
      async loadSession() {
        return {
          agentId: "agent-1",
          companyId: "company-123",
        };
      },
      async loadEnvironmentById() {
        return null;
      },
    } as never,
    {
      async loadDefinitionById() {
        return null;
      },
    } as never,
    {
      async expireElapsedLeases() {
        return undefined;
      },
      async findOpenLeaseForSession() {
        return null;
      },
    } as never,
    {
      async listAgentMcpServers() {
        return [];
      },
    } as never,
    {} as never,
    {
      async listActiveSkills(_transactionProvider: unknown, companyId: string, sessionId: string) {
        listActiveSkillsCalls.push({
          companyId,
          sessionId,
        });

        return [{
          companyId,
          description: "Browser automation guidance.",
          fileList: [],
          branchName: null,
          trackedCommitSha: null,
          githubRepositoryId: null,
          id: "skill-1",
          instructions: "Read this first.",
          name: "Browser skill",
          repository: null,
          skillDirectory: null,
          skillGroupId: null,
          sourceType: "manual",
        }];
      },
    } as never,
    {
      async getSession() {
        return {
          agentId: "agent-1",
          id: "session-1",
        };
      },
    } as never,
    {
      async findReusableEnvironmentForAgentSession() {
        return null;
      },
    } as never,
  );

  const result = await resolver.execute(
    null,
    {
      sessionId: "session-1",
    },
    {
      app_runtime_transaction_provider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            select() {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        defaultComputeProviderDefinitionId: null,
                        name: "Agent One",
                      }];
                    },
                  };
                },
              };
            },
          });
        },
      } as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
      },
    } as never,
  );

  assert.deepEqual(listActiveSkillsCalls, [{
    companyId: "company-123",
    sessionId: "session-1",
  }]);
  assert.deepEqual(result.activeSkills, [{
    autoUpdate: false,
    branchCommitSha: null,
    companyId: "company-123",
    description: "Browser automation guidance.",
    fileList: [],
    branchName: null,
    trackedCommitSha: null,
    branchSkillFileUrl: null,
    fileInventory: [],
    githubRepositoryId: null,
    id: "skill-1",
    instructions: "Read this first.",
    name: "Browser skill",
    repository: null,
    repositoryUrl: null,
    skillDirectory: null,
    skillDirectoryUrl: null,
    skillGroupId: null,
    skillType: "custom",
    sourceType: "manual",
    systemCommands: [],
    systemKey: null,
    trackedCommitSkillFileUrl: null,
  }]);
  assert.equal(result.currentEnvironment, null);
  assert.equal(result.agentDefaultComputeProviderDefinition, null);
  assert.deepEqual(result.mcpWarnings, []);
});

test("SessionEnvironmentQueryResolver exposes attached MCP warnings that need operator attention", async () => {
  const resolver = new SessionEnvironmentQueryResolver(
    {
      async loadSession() {
        return {
          agentId: "agent-1",
          companyId: "company-123",
        };
      },
      async loadEnvironmentById() {
        return null;
      },
    } as never,
    {
      async loadDefinitionById() {
        return null;
      },
    } as never,
    {
      async expireElapsedLeases() {
        return undefined;
      },
      async findOpenLeaseForSession() {
        return null;
      },
    } as never,
    {
      async listAgentMcpServers() {
        return [{
          authType: "oauth_authorization_code",
          callTimeoutMs: 10_000,
          companyId: "company-123",
          createdAt: new Date("2026-04-24T17:51:00.000Z"),
          description: null,
          enabled: true,
          headers: {},
          id: "mcp-server-1",
          name: "Notion",
          oauthClientId: "client-123",
          oauthConnectionStatus: "reauth_required",
          oauthGrantedScopes: [],
          oauthLastError: "Invalid refresh token.",
          oauthRequestedScopes: [],
          updatedAt: new Date("2026-04-24T17:51:00.000Z"),
          url: "https://mcp.notion.com/mcp",
        }];
      },
    } as never,
    {} as never,
    {
      async listActiveSkills() {
        return [];
      },
    } as never,
    {
      async getSession() {
        return {
          agentId: "agent-1",
          id: "session-1",
        };
      },
    } as never,
    {
      async findReusableEnvironmentForAgentSession() {
        return null;
      },
    } as never,
  );

  const result = await resolver.execute(
    null,
    {
      sessionId: "session-1",
    },
    {
      app_runtime_transaction_provider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            select() {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        defaultComputeProviderDefinitionId: null,
                        name: "Agent One",
                      }];
                    },
                  };
                },
              };
            },
          });
        },
      } as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
      },
    } as never,
  );

  assert.deepEqual(result.mcpWarnings, [{
    errorMessage: "Invalid refresh token.",
    recommendedAction: "Reconnect this MCP server in MCP settings to restore its tools for new chat sessions.",
    serverId: "mcp-server-1",
    serverName: "Notion",
    status: "reauth_required",
  }]);
});
