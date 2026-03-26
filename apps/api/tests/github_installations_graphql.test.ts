import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AddGithubInstallationMutation } from "../src/graphql/mutations/add_github_installation.ts";
import { DeleteGithubInstallationMutation } from "../src/graphql/mutations/delete_github_installation.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "../src/graphql/mutations/refresh_github_installation_repositories.ts";
import { GithubAppConfigQueryResolver } from "../src/graphql/resolvers/github_app_config.ts";

function createContext(transactionImplementation: (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>) {
  return {
    authSession: {
      company: {
        id: "company-123",
        name: "Example Org",
      },
    },
    app_runtime_transaction_provider: {
      transaction: transactionImplementation,
    },
  } as never;
}

test("GithubAppConfigQueryResolver exposes the GitHub App metadata", async () => {
  const resolver = new GithubAppConfigQueryResolver({
    getAppClientId() {
      return "Iv-test-local";
    },
    getAppLink() {
      return "https://github.com/apps/test-local";
    },
  } as never);

  assert.deepEqual(await resolver.execute({}, {}, {} as never), {
    appClientId: "Iv-test-local",
    appLink: "https://github.com/apps/test-local",
  });
});

test("AddGithubInstallationMutation links an installation and seeds repositories", async () => {
  const githubClient = {
    getInstallationRepositories: vi.fn().mockResolvedValue([
      {
        externalId: "1",
        name: "repo-one",
        fullName: "acme/repo-one",
        htmlUrl: "https://github.com/acme/repo-one",
        isPrivate: true,
        defaultBranch: "main",
        archived: false,
      },
    ]),
  };
  const insertedValues: Array<Record<string, unknown> | Array<Record<string, unknown>>> = [];
  let insertCallCount = 0;
  const createdAt = new Date("2026-03-26T18:00:00.000Z");
  const tx = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                async limit() {
                  return [];
                },
              };
            },
          };
        },
      };
    },
    insert() {
      insertCallCount += 1;
      if (insertCallCount === 1) {
        return {
          values(value: Record<string, unknown>) {
            insertedValues.push(value);
            return {
              async returning() {
                return [{
                  installationId: 110600868,
                  createdAt,
                }];
              },
            };
          },
        };
      }

      return {
        values(value: Array<Record<string, unknown>>) {
          insertedValues.push(value);
          return {
            async returning() {
              return [];
            },
          };
        },
      };
    },
  };
  const mutation = new AddGithubInstallationMutation(githubClient as never);

  const payload = await mutation.execute(
    {},
    {
      input: {
        installationId: "110600868",
        setupAction: "install",
      },
    },
    createContext(async (callback) => callback(tx)),
  );

  assert.deepEqual(githubClient.getInstallationRepositories.mock.calls, [[110600868]]);
  assert.equal(insertedValues.length, 2);
  assert.equal((insertedValues[0] as Record<string, unknown>)?.installationId, 110600868);
  assert.equal((insertedValues[0] as Record<string, unknown>)?.companyId, "company-123");
  assert.ok((insertedValues[0] as Record<string, unknown>)?.createdAt instanceof Date);
  const insertedRepositories = insertedValues[1] as Array<Record<string, unknown>>;
  assert.equal(insertedRepositories.length, 1);
  assert.equal(insertedRepositories[0]?.companyId, "company-123");
  assert.equal(insertedRepositories[0]?.installationId, 110600868);
  assert.equal(insertedRepositories[0]?.externalId, "1");
  assert.equal(insertedRepositories[0]?.fullName, "acme/repo-one");
  assert.deepEqual(payload.githubInstallation, {
    id: "110600868",
    installationId: "110600868",
    createdAt: "2026-03-26T18:00:00.000Z",
  });
  assert.equal(payload.repositories.length, 1);
  assert.equal(payload.repositories[0]?.githubInstallationId, "110600868");
  assert.equal(payload.repositories[0]?.externalId, "1");
  assert.equal(payload.repositories[0]?.fullName, "acme/repo-one");
});

test("AddGithubInstallationMutation rejects installations already linked elsewhere", async () => {
  const githubClient = {
    getInstallationRepositories: vi.fn().mockResolvedValue([]),
  };
  const duplicateKeyError = Object.assign(new Error("duplicate key"), {
    code: "23505",
  });
  const tx = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                async limit() {
                  return [];
                },
              };
            },
          };
        },
      };
    },
    insert() {
      return {
        values() {
          return {
            async returning() {
              throw duplicateKeyError;
            },
          };
        },
      };
    },
  };
  const mutation = new AddGithubInstallationMutation(githubClient as never);

  await assert.rejects(
    () => mutation.execute(
      {},
      {
        input: {
          installationId: "110600868",
        },
      },
      createContext(async (callback) => callback(tx)),
    ),
    /already linked to another company/,
  );
});

test("RefreshGithubInstallationRepositoriesMutation replaces the cached repositories", async () => {
  const githubClient = {
    getInstallationRepositories: vi.fn().mockResolvedValue([
      {
        externalId: "1",
        name: "repo-one",
        fullName: "acme/repo-one",
        htmlUrl: "https://github.com/acme/repo-one",
        isPrivate: true,
        defaultBranch: "main",
        archived: false,
      },
      {
        externalId: "2",
        name: "repo-two",
        fullName: "acme/repo-two",
        htmlUrl: "https://github.com/acme/repo-two",
        isPrivate: false,
        defaultBranch: "develop",
        archived: false,
      },
    ]),
  };
  const deletedConditions: unknown[] = [];
  const insertedRepositorySets: Array<Array<Record<string, unknown>>> = [];
  let selectCallCount = 0;
  const tx = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return {
          from() {
            return {
              where() {
                return {
                  async limit() {
                    return [{
                      installationId: 110600868,
                    }];
                  },
                };
              },
            };
          },
        };
      }

      return {
        from() {
          return {
            where() {
              return {
                async orderBy() {
                  return [
                    {
                      id: "repo-db-1",
                      installationId: 110600868,
                      externalId: "1",
                      name: "repo-one",
                      fullName: "acme/repo-one",
                      htmlUrl: "https://github.com/acme/repo-one",
                      isPrivate: true,
                      defaultBranch: "main",
                      archived: false,
                      createdAt: new Date("2026-03-26T19:00:00.000Z"),
                      updatedAt: new Date("2026-03-26T19:00:00.000Z"),
                    },
                    {
                      id: "repo-db-2",
                      installationId: 110600868,
                      externalId: "2",
                      name: "repo-two",
                      fullName: "acme/repo-two",
                      htmlUrl: "https://github.com/acme/repo-two",
                      isPrivate: false,
                      defaultBranch: "develop",
                      archived: false,
                      createdAt: new Date("2026-03-26T19:00:00.000Z"),
                      updatedAt: new Date("2026-03-26T19:00:00.000Z"),
                    },
                  ];
                },
              };
            },
          };
        },
      };
    },
    delete() {
      return {
        async where(condition: unknown) {
          deletedConditions.push(condition);
          return [];
        },
      };
    },
    insert() {
      return {
        values(value: Array<Record<string, unknown>>) {
          insertedRepositorySets.push(value);
          return {
            async returning() {
              return [];
            },
          };
        },
      };
    },
  };
  const mutation = new RefreshGithubInstallationRepositoriesMutation(githubClient as never);

  const payload = await mutation.execute(
    {},
    {
      input: {
        installationId: "110600868",
      },
    },
    createContext(async (callback) => callback(tx)),
  );

  assert.deepEqual(githubClient.getInstallationRepositories.mock.calls, [[110600868, { forceRefresh: true }]]);
  assert.equal(deletedConditions.length, 1);
  assert.equal(insertedRepositorySets.length, 1);
  assert.equal(insertedRepositorySets[0]?.length, 2);
  assert.equal(payload.repositories.length, 2);
  assert.deepEqual(payload.repositories.map((repository) => repository.id), ["repo-db-1", "repo-db-2"]);
});

test("DeleteGithubInstallationMutation returns the deleted installation id", async () => {
  const mutation = new DeleteGithubInstallationMutation();
  const tx = {
    delete() {
      return {
        where() {
          return {
            async returning() {
              return [{
                installationId: 110600868,
              }];
            },
          };
        },
      };
    },
  };

  const payload = await mutation.execute(
    {},
    {
      input: {
        installationId: "110600868",
      },
    },
    createContext(async (callback) => callback(tx)),
  );

  assert.deepEqual(payload, {
    deletedInstallationId: "110600868",
  });
});
