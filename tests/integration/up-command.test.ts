import { expect, test, vi } from "vitest";

import { buildProgram } from "../../src/commands/register-commands.js";

test("invokes the up handler", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await program.parseAsync(["node", "companyhelm", "up"]);

  expect(up).toHaveBeenCalledWith({ logLevel: "info" });
});

test("forwards an explicit log level to the up handler", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await program.parseAsync(["node", "companyhelm", "up", "--log-level", "debug"]);

  expect(up).toHaveBeenCalledWith({ logLevel: "debug" });
});

test("forwards api local repo mode with the sibling default marker", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await program.parseAsync(["node", "companyhelm", "up", "--api-repo-path"]);

  expect(up).toHaveBeenCalledWith({ logLevel: "info", apiRepoPath: true });
});

test("forwards an explicit api local repo path", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await program.parseAsync(["node", "companyhelm", "up", "--api-repo-path", "../companyhelm-api"]);

  expect(up).toHaveBeenCalledWith({ logLevel: "info", apiRepoPath: "../companyhelm-api" });
});

test("forwards frontend local repo mode with the sibling default marker", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await program.parseAsync(["node", "companyhelm", "up", "--web-repo-path"]);

  expect(up).toHaveBeenCalledWith({ logLevel: "info", webRepoPath: true });
});

test("forwards an explicit frontend local repo path", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await program.parseAsync(["node", "companyhelm", "up", "--web-repo-path", "../companyhelm-web"]);

  expect(up).toHaveBeenCalledWith({ logLevel: "info", webRepoPath: "../companyhelm-web" });
});

test("forwards both local repo options together", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await program.parseAsync([
    "node",
    "companyhelm",
    "up",
    "--api-repo-path",
    "../companyhelm-api",
    "--web-repo-path",
    "../companyhelm-web"
  ]);

  expect(up).toHaveBeenCalledWith({
    logLevel: "info",
    apiRepoPath: "../companyhelm-api",
    webRepoPath: "../companyhelm-web"
  });
});

test("rejects unsupported log levels", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await expect(program.parseAsync(["node", "companyhelm", "up", "--log-level", "trace"])).rejects.toThrow(
    'Unsupported log level "trace". Expected one of: debug, info, warn, error.'
  );
  expect(up).not.toHaveBeenCalled();
});
