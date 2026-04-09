import "reflect-metadata";
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
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
};

class SkillsGraphqlTestHarness {
  static createConfigMock(): Config {
    return {
      auth: {
        provider: "clerk",
      },
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
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
                    id: "skill-new",
                    instructions: String(value.instructions),
                    name: String(value.name),
                    repository: null,
                    skillDirectory: null,
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
          select() {
            return {
              from(table: unknown) {
                return {
                  async where(_condition: unknown) {
                    void _condition;
                    if (table === skills) {
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
            if (table !== skill_groups) {
              throw new Error("Unexpected delete table.");
            }

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
          },
        } as never;
      },
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
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

  await new GraphqlApplication(
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

test("GraphQL skill group mutations create groups and ungroup skills on delete", async () => {
  const app = Fastify();
  const config = SkillsGraphqlTestHarness.createConfigMock();
  const database = SkillsGraphqlTestHarness.createDatabaseMock();
  database.skillRecords.push({
    companyId: "company-123",
    description: "Research notes",
    fileList: [],
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

  await new GraphqlApplication(
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
