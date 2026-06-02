import assert from "node:assert/strict";
import { test } from "node:test";
import { CompanyHelmCli } from "../src/companyhelm_cli.js";
import type { CliIo } from "../src/cli_io_interface.js";

class CapturingCliIo implements CliIo {
  readonly errors: string[] = [];
  readonly lines: string[] = [];

  writeLine(message: string): void {
    this.lines.push(message);
  }

  writeError(message: string): void {
    this.errors.push(message);
  }
}

test("status command describes the npm package layout", async () => {
  const io = new CapturingCliIo();
  await new CompanyHelmCli(io).run(["node", "companyhelm", "status"]);

  assert.equal(io.errors.length, 0);
  assert.deepEqual(io.lines, [
    "CompanyHelm CLI is installed.",
    "Main CLI package: companyhelm",
    "Runner package: @companyhelm/runner",
    "Server workspace package: @companyhelm/server",
  ]);
});

test("runner command points users at the standalone runner package", async () => {
  const io = new CapturingCliIo();
  await new CompanyHelmCli(io).run(["node", "companyhelm", "runner", "start"]);

  assert.equal(io.errors.length, 0);
  assert.match(io.lines.join("\n"), /npx @companyhelm\/runner start/);
});
