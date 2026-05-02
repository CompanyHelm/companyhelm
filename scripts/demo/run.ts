import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { DemoContext } from "./context.ts";

/**
 * Runs one task-specific demo script as TypeScript so operators can compose reusable Playwright
 * CLI building blocks without editing the command implementation for each scenario. The command
 * also checks that the local demo environment is already reachable before it hands control to the
 * scenario script.
 */
export class DemoRunScript {
  async run(argv: string[] = process.argv): Promise<void> {
    const scriptPath = await this.readScriptPath(argv);
    await this.assertDemoEnvironmentIsReachable();
    await this.runScenarioScript(scriptPath);
  }

  async readScriptPath(argv: string[]): Promise<string> {
    const scriptArgument = argv.slice(2).find((argument) => !argument.startsWith("-"));
    if (!scriptArgument) {
      throw new Error("demo:run requires a script path. Example: npm run demo:run -- ./scripts/demo/my_scenario.ts");
    }

    const resolvedPath = resolve(process.cwd(), scriptArgument);
    await access(resolvedPath);
    return resolvedPath;
  }

  private async assertDemoEnvironmentIsReachable(): Promise<void> {
    const context = new DemoContext();
    const checks = [
      `${context.apiUrl()}/health`,
      `${context.apiUrl()}/auth/dev/users`,
      context.webUrl(),
    ];
    for (const url of checks) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Demo environment is not ready at ${url}. Run npm run demo:up first.`);
      }
    }

    const graphqlResponse = await fetch(`${context.apiUrl()}/graphql`, {
      body: JSON.stringify({
        query: "query DemoHealth { health }",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
    if (!graphqlResponse.ok) {
      throw new Error(`Demo GraphQL endpoint is not ready at ${context.apiUrl()}/graphql. Run npm run demo:up first.`);
    }
  }

  private runScenarioScript(scriptPath: string): Promise<void> {
    const context = new DemoContext();
    return new Promise((resolvePromise, reject) => {
      const childProcess = spawn("npm", ["exec", "--", "tsx", scriptPath], {
        env: {
          ...process.env,
          DEMO_API_URL: context.apiUrl(),
          DEMO_ORGANIZATION_SLUG: context.organizationSlug(),
          DEMO_WEB_URL: context.webUrl(),
        },
        stdio: "inherit",
      });
      childProcess.once("error", reject);
      childProcess.once("exit", (code, signal) => {
        if (code === 0) {
          resolvePromise();
          return;
        }

        reject(new Error(`Demo script ${scriptPath} failed with ${signal ?? `exit code ${code}`}.`));
      });
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  new DemoRunScript().run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Failed to run scripts/demo/run.ts.";
    console.error(message);
    process.exit(1);
  });
}
