import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { GithubRepositoryProvisioningSyncService } from "../src/services/repositories/sync_service.ts";

test("GithubRepositoryProvisioningSyncService clones pinned repositories with installation-token auth", async () => {
  const executeCommand = vi.fn(async (
    _command: string,
    _workingDirectory: string | undefined,
    _environment: Record<string, string>,
    _timeoutSeconds: number,
  ) => {
    void _command;
    void _workingDirectory;
    void _environment;
    void _timeoutSeconds;

    return {
      exitCode: 0,
      stdout: "Cloning into repo-one",
    };
  });
  const getInstallationAccessToken = vi.fn(async () => "ghs_installation_token");
  const service = new GithubRepositoryProvisioningSyncService(
    {
      async listProvisionings() {
        return [{
          companyId: "company-1",
          createdAt: new Date("2026-04-21T18:01:00.000Z"),
          githubRepository: {
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
          },
          githubRepositoryId: "github-repository-1",
          id: "provisioning-1",
          updatedAt: new Date("2026-04-21T18:01:00.000Z"),
        }];
      },
    } as never,
    {
      getInstallationAccessToken,
    } as never,
  );

  await service.syncProvisionedRepositories({} as never, {
    companyId: "company-1",
    environmentShell: {
      executeCommand,
    } as never,
  });

  assert.deepEqual(getInstallationAccessToken.mock.calls, [[110600868]]);
  assert.equal(executeCommand.mock.calls.length, 1);
  const [command, workingDirectory, environment, timeoutSeconds] = executeCommand.mock.calls[0] ?? [];
  assert.equal(workingDirectory, undefined);
  assert.equal(timeoutSeconds, 120);
  assert.deepEqual(environment, {
    GH_PROMPT_DISABLED: "1",
    GITHUB_INSTALLATION_TOKEN: "ghs_installation_token",
    GIT_TERMINAL_PROMPT: "0",
  });
  assert.match(String(command), /workspace_dir=\$HOME\/workspace/);
  assert.match(String(command), /repository_name=.*repo-one/);
  assert.match(String(command), /https:\/\/github\.com\/acme\/repo-one\.git/);
  assert.match(String(command), /http\.https:\/\/github\.com\/\.extraheader/);
});
