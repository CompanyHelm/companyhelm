import "reflect-metadata";
import { generateKeyPairSync } from "node:crypto";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { skill_groups, skills } from "../src/db/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

type MockSkillGroupRecord = {
  companyId: string;
  id: string;
  name: string;
};

type MockSkillRecord = {
  companyId: string;
  description: string;
  fileList: string[];
  githubBranchName: string | null;
  githubTrackedCommitSha: string | null;
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
};

const TEST_PRIVATE_KEY_PEM = (() => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs1", format: "pem" }).toString();
})();

class SkillsGraphqlTestHarness {
  static createConfigMock(): Config {
    return {
      auth: {
        provider: "clerk",
      },
      database: {
        host: "127.0.0.1",
        name: "companyhelm_test",
        port: 5432,
        roles: {
          admin: {
            password: "postgres",
            username: "postgres",
          },
          app_runtime: {
            password: "postgres",
            username: "postgres",
          },
        },
      },
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      github: {
        app_client_id: "Iv-test-local",
        app_link: "https://github.com/apps/companyhelm-test",
        app_private_key_pem: TEST_PRIVATE_KEY_PEM,
      },
      log: {
        json: false,
        level: "info",
      },
      redis: {
        host: "127.0.0.1",
        password: "",
        port: 6379,
        username: "",
      },
      security: {
        encryption: {
          key: "companyhelm-test-encryption-key",
          key_id: "companyhelm-test-key",
        },
      },
    } as Config;
  }

  static createDatabaseMock() {
    const groups: MockSkillGroupRecord[] = [{
      companyId: "company-123",
      id: "group-research",
      name: "Research",
    }, {
      companyId: "company-123",
      id: "group-automation",
      name: "Automation",
    }];
    const skillRecords: MockSkillRecord[] = [{
      companyId: "company-123",
      description: "Runs browser tasks.",
      fileList: ["scripts/open.sh"],
      githubBranchName: null,
      githubTrackedCommitSha: null,
      id: "skill-browser",
      instructions: "Read SKILL.md first.",
      name: "Browser automation",
      repository: "companyhelm/skills",
      skillDirectory: "skills/browser",
      skillGroupId: "group-automation",
    }];
    const insertedValues: Array<Record<string, unknown>> = [];

    return {
      insertedValues,
      groups,
      skillRecords,
      getDatabase() {
        return {
          insert(table: unknown) {
            if (table === skills) {
              return {
                values(value: Record<string, unknown>) {
                  insertedValues.push(value);
                  const createdSkill: MockSkillRecord = {
                    companyId: String(value.companyId),
                    description: String(value.description),
                    fileList: [...(value.fileList as string[])],
                    githubBranchName: value.githubBranchName ? String(value.githubBranchName) : null,
                    githubTrackedCommitSha: value.githubTrackedCommitSha ? String(value.githubTrackedCommitSha) : null,
                    id: "skill-new",
                    instructions: String(value.instructions),
                    name: String(value.name),
                    repository: value.repository ? String(value.repository) : null,
                    skillDirectory: value.skillDirectory ? String(value.skillDirectory) : null,
                    skillGroupId: value.skillGroupId ? String(value.skillGroupId) : null,
                  };
                  skillRecords.push(createdSkill);

                  return {
                    async returning() {
                      return [createdSkill];
                    },
                  };
                },
              };
            }
            if (table === skill_groups) {
              return {
                values(value: Record<string, unknown>) {
                  insertedValues.push(value);
                  const createdGroup: MockSkillGroupRecord = {
                    companyId: String(value.companyId),
                    id: "group-new",
                    name: String(value.name),
                  };
                  groups.push(createdGroup);

                  return {
                    async returning() {
                      return [createdGroup];
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected insert table.");
          },
          select(selection?: Record<string, unknown>) {
            return {
              from(table: unknown) {
                return {
                  async where(_condition: unknown) {
                    void _condition;
                    if (table === skills) {
                      if (selection && Object.keys(selection).length === 1 && "skillDirectory" in selection) {
                        return [];
                      }

                      return [...skillRecords];
                    }
                    if (table === skill_groups) {
                      return [...groups];
                    }

                    throw new Error("Unexpected select table.");
                  },
                };
              },
            };
          },
          delete(table: unknown) {
            if (table === skill_groups) {
              return {
                where(_condition: unknown) {
                  void _condition;
                  return {
                    async returning() {
                      const [deletedGroup] = groups.splice(0, 1);
                      if (!deletedGroup) {
                        return [];
                      }

                      for (const skillRecord of skillRecords) {
                        if (skillRecord.skillGroupId === deletedGroup.id) {
                          skillRecord.skillGroupId = null;
                        }
                      }

                      return [deletedGroup];
                    },
                  };
                },
              };
            }
            if (table === skills) {
              return {
                where(_condition: unknown) {
                  void _condition;
                  return {
                    async returning() {
                      const [deletedSkill] = skillRecords.splice(0, 1);
                      return deletedSkill ? [deletedSkill] : [];
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected delete table.");
          },
        } as never;
      },
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

function createJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });
}

test("GraphQL skills query and create mutation expose the skill catalog and group assignment", async () => {
  const app = Fastify();
  const config = SkillsGraphqlTestHarness.createConfigMock();
  const database = SkillsGraphqlTestHarness.createDatabaseMock();
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
        },
      };
    },
  };

  await GraphqlApplication.fromResolvers(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database as never),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  ).register(app);

  const initialQueryResponse = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query SkillsPageQuery {
          SkillGroups {
            companyId
            id
            name
          }
          Skills {
            companyId
            id
            name
            skillGroupId
            repository
            skillDirectory
            fileList
          }
        }
      `,
    },
  });

  assert.equal(initialQueryResponse.statusCode, 200);
  const initialDocument = initialQueryResponse.json();
  assert.deepEqual(initialDocument.data.SkillGroups, [{
    companyId: "company-123",
    id: "group-automation",
    name: "Automation",
  }, {
    companyId: "company-123",
    id: "group-research",
    name: "Research",
  }]);
  assert.deepEqual(initialDocument.data.Skills, [{
    companyId: "company-123",
    id: "skill-browser",
    name: "Browser automation",
    skillGroupId: "group-automation",
    repository: "companyhelm/skills",
    skillDirectory: "skills/browser",
    fileList: ["scripts/open.sh"],
  }]);

  const createResponse = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation CreateSkill($input: CreateSkillInput!) {
          CreateSkill(input: $input) {
            id
            companyId
            name
            description
            instructions
            skillGroupId
            fileList
            repository
            skillDirectory
          }
        }
      `,
      variables: {
        input: {
          description: "Reusable QA guidance",
          instructions: "Open the checklist first.",
          name: "QA checklist",
          skillGroupId: "group-research",
        },
      },
    },
  });

  assert.equal(createResponse.statusCode, 200);
  const createDocument = createResponse.json();
  assert.deepEqual(createDocument.data.CreateSkill, {
    id: "skill-new",
    companyId: "company-123",
    name: "QA checklist",
    description: "Reusable QA guidance",
    instructions: "Open the checklist first.",
    skillGroupId: "group-research",
    fileList: [],
    repository: null,
    skillDirectory: null,
  });

  const [insertedSkill] = database.insertedValues;
  assert.equal(insertedSkill?.companyId, "company-123");
  assert.equal(insertedSkill?.name, "QA checklist");
  assert.equal(insertedSkill?.skillGroupId, "group-research");
  assert.deepEqual(insertedSkill?.fileList, []);

  await app.close();
});

test("GraphQL GitHub skill discovery and batch import reuse the discovered payload", async () => {
  const app = Fastify();
  const config = SkillsGraphqlTestHarness.createConfigMock();
  const database = SkillsGraphqlTestHarness.createDatabaseMock();
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
        },
      };
    },
  };
  const originalFetch = global.fetch;
  let allowGithubFetchDuringMutation = true;
  global.fetch = async (input) => {
    const url = String(input);
    if (!allowGithubFetchDuringMutation && url.includes("/repos/companyhelm/skills")) {
      throw new Error(`Mutation should not refetch GitHub content: ${url}`);
    }
    if (url.endsWith("/repos/companyhelm/skills")) {
      return createJsonResponse({
        default_branch: "main",
        full_name: "companyhelm/skills",
        private: false,
      });
    }
    if (url.includes("/repos/companyhelm/skills/branches?")) {
      return createJsonResponse([{
        commit: {
          sha: "commit-sha-main",
        },
        name: "main",
      }, {
        commit: {
          sha: "commit-sha-release",
        },
        name: "release",
      }]);
    }
    if (url.includes("/repos/companyhelm/skills/branches/main")) {
      return createJsonResponse({
        commit: {
          sha: "commit-sha-main",
        },
        name: "main",
      });
    }
    if (url.includes("/repos/companyhelm/skills/git/trees/commit-sha-main")) {
      return createJsonResponse({
        truncated: false,
        tree: [{
          path: "skills/github-browser/SKILL.md",
          sha: "sha-github-browser-skill",
          type: "blob",
        }, {
          path: "skills/github-browser/scripts/import.sh",
          sha: "sha-github-browser-script",
          type: "blob",
        }],
      });
    }
    if (url.includes("/repos/companyhelm/skills/git/blobs/sha-github-browser-skill")) {
      return createJsonResponse({
        content: Buffer.from([
          "---",
          "name: Imported browser",
          "description: Use the imported browser helpers.",
          "---",
          "",
          "Use the imported browser helpers.",
        ].join("\n")).toString("base64"),
        encoding: "base64",
      });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };

  try {
    await GraphqlApplication.fromResolvers(
      config,
      new AddModelProviderCredentialMutation(modelManager as never),
      new DeleteModelProviderCredentialMutation(),
      new RefreshModelProviderCredentialModelsMutation(modelManager as never),
      new GraphqlRequestContextResolver(authProvider as never, database as never),
      new HealthQueryResolver(),
      new MeQueryResolver(),
      new ModelProviderCredentialModelsQueryResolver(),
      new ModelProviderCredentialsQueryResolver(),
    ).register(app);

    const branchesResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: {
        authorization: "Bearer jwt-token",
      },
      payload: {
        query: `
          query GithubSkillBranches($repositoryUrl: String!) {
            GithubSkillBranches(repositoryUrl: $repositoryUrl) {
              commitSha
              isDefault
              name
              repository
            }
          }
        `,
        variables: {
          repositoryUrl: "https://github.com/companyhelm/skills",
        },
      },
    });

    assert.equal(branchesResponse.statusCode, 200);
    const branchesDocument = branchesResponse.json();
    assert.deepEqual(branchesDocument.data.GithubSkillBranches, [{
      commitSha: "commit-sha-main",
      isDefault: true,
      name: "main",
      repository: "companyhelm/skills",
    }, {
      commitSha: "commit-sha-release",
      isDefault: false,
      name: "release",
      repository: "companyhelm/skills",
    }]);

    const discoveredSkillsResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: {
        authorization: "Bearer jwt-token",
      },
      payload: {
        query: `
          query GithubDiscoveredSkills($repositoryUrl: String!, $branchName: String!) {
            GithubDiscoveredSkills(repositoryUrl: $repositoryUrl, branchName: $branchName) {
              branchName
              commitSha
              description
              fileList
              instructions
              name
              repository
              skillDirectory
            }
          }
        `,
        variables: {
          branchName: "main",
          repositoryUrl: "https://github.com/companyhelm/skills",
        },
      },
    });

    assert.equal(discoveredSkillsResponse.statusCode, 200);
    const discoveredSkillsDocument = discoveredSkillsResponse.json();
    assert.deepEqual(discoveredSkillsDocument.data.GithubDiscoveredSkills, [{
      branchName: "main",
      commitSha: "commit-sha-main",
      description: "Use the imported browser helpers.",
      fileList: ["skills/github-browser/scripts/import.sh"],
      instructions: "Use the imported browser helpers.",
      name: "Imported browser",
      repository: "companyhelm/skills",
      skillDirectory: "skills/github-browser",
    }]);

    allowGithubFetchDuringMutation = false;
    const importResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: {
        authorization: "Bearer jwt-token",
      },
      payload: {
        query: `
          mutation ImportGithubSkills($input: ImportGithubSkillsInput!) {
            ImportGithubSkills(input: $input) {
              id
              companyId
              name
              description
              instructions
              skillGroupId
              githubBranchName
              githubTrackedCommitSha
              repository
              skillDirectory
              fileList
            }
          }
        `,
        variables: {
          input: {
            skillGroupId: "group-research",
            skills: discoveredSkillsDocument.data.GithubDiscoveredSkills,
          },
        },
      },
    });

    assert.equal(importResponse.statusCode, 200);
    const importDocument = importResponse.json();
    assert.deepEqual(importDocument.data.ImportGithubSkills, [{
      companyId: "company-123",
      description: "Use the imported browser helpers.",
      fileList: ["skills/github-browser/scripts/import.sh"],
      githubBranchName: "main",
      githubTrackedCommitSha: "commit-sha-main",
      id: "skill-new",
      instructions: "Use the imported browser helpers.",
      name: "Imported browser",
      repository: "companyhelm/skills",
      skillDirectory: "skills/github-browser",
      skillGroupId: "group-research",
    }]);

    const importedSkillInsert = database.insertedValues.at(-1);
    assert.equal(importedSkillInsert?.githubBranchName, "main");
    assert.equal(importedSkillInsert?.githubTrackedCommitSha, "commit-sha-main");
    assert.equal(importedSkillInsert?.repository, "companyhelm/skills");
    assert.equal(importedSkillInsert?.skillDirectory, "skills/github-browser");
    assert.deepEqual(importedSkillInsert?.fileList, ["skills/github-browser/scripts/import.sh"]);
  } finally {
    global.fetch = originalFetch;
    await app.close();
  }
});

test("GraphQL skill group mutations create groups and ungroup skills on delete", async () => {
  const app = Fastify();
  const config = SkillsGraphqlTestHarness.createConfigMock();
  const database = SkillsGraphqlTestHarness.createDatabaseMock();
  database.skillRecords.push({
    companyId: "company-123",
    description: "Research notes",
    fileList: [],
    githubBranchName: null,
    githubTrackedCommitSha: null,
    id: "skill-research",
    instructions: "Open the research checklist.",
    name: "Research helper",
    repository: null,
    skillDirectory: null,
    skillGroupId: "group-research",
  });
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
        },
      };
    },
  };

  await GraphqlApplication.fromResolvers(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database as never),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  ).register(app);

  const createGroupResponse = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation CreateSkillGroup($input: CreateSkillGroupInput!) {
          CreateSkillGroup(input: $input) {
            id
            companyId
            name
          }
        }
      `,
      variables: {
        input: {
          name: "Docs",
        },
      },
    },
  });

  assert.equal(createGroupResponse.statusCode, 200);
  const createGroupDocument = createGroupResponse.json();
  assert.deepEqual(createGroupDocument.data.CreateSkillGroup, {
    id: "group-new",
    companyId: "company-123",
    name: "Docs",
  });

  const deleteGroupResponse = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation DeleteSkillGroup($input: DeleteSkillGroupInput!) {
          DeleteSkillGroup(input: $input) {
            id
            companyId
            name
          }
        }
      `,
      variables: {
        input: {
          id: "group-research",
        },
      },
    },
  });

  assert.equal(deleteGroupResponse.statusCode, 200);
  const deleteGroupDocument = deleteGroupResponse.json();
  assert.deepEqual(deleteGroupDocument.data.DeleteSkillGroup, {
    id: "group-research",
    companyId: "company-123",
    name: "Research",
  });

  const listResponse = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query SkillGroupsAfterDelete {
          SkillGroups {
            id
            name
          }
          Skills {
            id
            skillGroupId
          }
        }
      `,
    },
  });

  assert.equal(listResponse.statusCode, 200);
  const listDocument = listResponse.json();
  assert.deepEqual(listDocument.data.SkillGroups, [{
    id: "group-automation",
    name: "Automation",
  }, {
    id: "group-new",
    name: "Docs",
  }]);
  assert.deepEqual(listDocument.data.Skills, [{
    id: "skill-browser",
    skillGroupId: "group-automation",
  }, {
    id: "skill-research",
    skillGroupId: null,
  }]);

  await app.close();
});

test("GraphQL skill deletion removes the catalog entry", async () => {
  const app = Fastify();
  const config = SkillsGraphqlTestHarness.createConfigMock();
  const database = SkillsGraphqlTestHarness.createDatabaseMock();
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
        },
      };
    },
  };

  await GraphqlApplication.fromResolvers(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database as never),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  ).register(app);

  const deleteSkillResponse = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation DeleteSkill($input: DeleteSkillInput!) {
          DeleteSkill(input: $input) {
            id
            companyId
            name
          }
        }
      `,
      variables: {
        input: {
          id: "skill-browser",
        },
      },
    },
  });

  assert.equal(deleteSkillResponse.statusCode, 200);
  const deleteSkillDocument = deleteSkillResponse.json();
  assert.deepEqual(deleteSkillDocument.data.DeleteSkill, {
    id: "skill-browser",
    companyId: "company-123",
    name: "Browser automation",
  });
  assert.equal(database.skillRecords.length, 0);

  await app.close();
});
