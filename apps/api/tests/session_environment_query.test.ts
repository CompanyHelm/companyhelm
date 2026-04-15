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
    {} as never,
    {
      async listActiveSkills(_transactionProvider, companyId: string, sessionId: string) {
        listActiveSkillsCalls.push({
          companyId,
          sessionId,
        });

        return [{
          companyId,
          description: "Browser automation guidance.",
          fileList: [],
          githubBranchName: null,
          githubTrackedCommitSha: null,
          id: "skill-1",
          instructions: "Read this first.",
          name: "Browser skill",
          repository: null,
          skillDirectory: null,
          skillGroupId: null,
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
    companyId: "company-123",
    description: "Browser automation guidance.",
    fileList: [],
    githubBranchName: null,
    githubTrackedCommitSha: null,
    id: "skill-1",
    instructions: "Read this first.",
    name: "Browser skill",
    repository: null,
    skillDirectory: null,
    skillGroupId: null,
  }]);
  assert.equal(result.currentEnvironment, null);
  assert.equal(result.agentDefaultComputeProviderDefinition, null);
});
