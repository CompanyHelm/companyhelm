import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function applyCurrentWorkingDirectoryMode(projectRoot: string): void {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const fsModule = require("node:fs") as typeof import("node:fs") & {
    rmSync: typeof import("node:fs").rmSync;
  };
  const originalRmSync = fsModule.rmSync.bind(fsModule);
  fsModule.rmSync = ((target, options) => {
    if (path.resolve(String(target)) === resolvedProjectRoot) {
      return;
    }

    return originalRmSync(target, options);
  }) as typeof fsModule.rmSync;

  const configModule = require("@companyhelm/runner/dist/config.js") as {
    config: {
      parse: (input?: Record<string, unknown>) => unknown;
    };
  };
  const originalParse = configModule.config.parse.bind(configModule.config);
  configModule.config.parse = ((input: Record<string, unknown> = {}) =>
    originalParse({
      ...input,
      workspaces_directory: resolvedProjectRoot
    })) as typeof configModule.config.parse;

  const threadLifecycle = require("@companyhelm/runner/dist/service/thread_lifecycle.js") as {
    resolveThreadDirectory: (configDirectory: string, threadsDirectory: string, threadId: string) => string;
  };
  threadLifecycle.resolveThreadDirectory = (() => resolvedProjectRoot) as typeof threadLifecycle.resolveThreadDirectory;
}

const workspaceMode = String(process.env.COMPANYHELM_RUNNER_WORKSPACE_MODE || "").trim();
const projectRoot = String(process.env.COMPANYHELM_RUNNER_PROJECT_ROOT || "").trim();

if (workspaceMode === "current-working-directory" && projectRoot) {
  applyCurrentWorkingDirectoryMode(projectRoot);
}

const runnerEntrypoint = process.argv[2];
await import(runnerEntrypoint ? pathToFileURL(runnerEntrypoint).href : "@companyhelm/runner/dist/cli.js");
