import assert from "node:assert/strict";
import { test } from "vitest";
import { GithubRepositoryProvisioningService } from "../src/services/repositories/provisioning_service.ts";

const repositoryOne = {
  archived: false,
  createdAt: new Date("2026-04-21T18:00:00.000Z"),
  defaultBranch: "main",
  externalId: "1",
  fullName: "acme/repo-one",
  htmlUrl: "https://github.com/acme/repo-one",
  id: "github-repository-1",
  installationId: 110600868,
  isPrivate: true,
  name: "repo-one",
  updatedAt: new Date("2026-04-21T18:00:00.000Z"),
};

test("GithubRepositoryProvisioningService pins a repository by its cached repository row", async () => {
  const insertedValues: Record<string, unknown>[] = [];
  let selectCallCount = 0;
  const service = new GithubRepositoryProvisioningService();
  const provisioning = await service.createProvisioning({
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback({
        select() {
          selectCallCount += 1;
          return {
            from() {
              return {
                where() {
                  return {
                    async limit() {
                      return [repositoryOne];
                    },
                    async orderBy() {
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
            values(value: Record<string, unknown>) {
              insertedValues.push(value);
              return {
                async returning() {
                  return [{
                    companyId: "company-1",
                    createdAt: new Date("2026-04-21T18:01:00.000Z"),
                    githubRepositoryId: "github-repository-1",
                    id: "provisioning-1",
                    updatedAt: new Date("2026-04-21T18:01:00.000Z"),
                  }];
                },
              };
            },
          };
        },
      });
    },
  } as never, {
    companyId: "company-1",
    githubRepositoryId: "github-repository-1",
  });

  assert.equal(selectCallCount, 2);
  assert.equal(insertedValues.length, 1);
  assert.equal(insertedValues[0]?.companyId, "company-1");
  assert.equal(insertedValues[0]?.githubRepositoryId, "github-repository-1");
  assert.equal(provisioning.id, "provisioning-1");
  assert.equal(provisioning.githubRepository.fullName, "acme/repo-one");
});

test("GithubRepositoryProvisioningService rejects repository name collisions", async () => {
  const service = new GithubRepositoryProvisioningService();
  let selectCallCount = 0;

  await assert.rejects(
    service.createProvisioning({
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            selectCallCount += 1;
            return {
              from() {
                return {
                  where() {
                    return {
                      async limit() {
                        return [{
                          ...repositoryOne,
                          fullName: "other/repo-one",
                          id: "github-repository-2",
                        }];
                      },
                      async orderBy() {
                        if (selectCallCount === 2) {
                          return [{
                            companyId: "company-1",
                            createdAt: new Date("2026-04-21T18:01:00.000Z"),
                            githubRepositoryId: "github-repository-1",
                            id: "provisioning-1",
                            updatedAt: new Date("2026-04-21T18:01:00.000Z"),
                          }];
                        }

                        return [repositoryOne];
                      },
                    };
                  },
                };
              },
            };
          },
          insert() {
            throw new Error("insert should not run when repository names collide");
          },
        });
      },
    } as never, {
      companyId: "company-1",
      githubRepositoryId: "github-repository-2",
    }),
    /already pinned/,
  );
});
