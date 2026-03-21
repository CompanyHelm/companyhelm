import assert from "node:assert/strict";
import test from "node:test";
import { CommanderError } from "commander";
import { ApiCli } from "../src/cli/api_cli.ts";

test("ApiCli requires --config-path", () => {
  const cli = new ApiCli();

  assert.throws(
    () => cli.parse(["node", "server.js"]),
    (error: unknown) => error instanceof CommanderError && error.code === "commander.missingMandatoryOptionValue",
  );
});

test("ApiCli returns the provided --config-path", () => {
  const cli = new ApiCli();
  const document = cli.parse(["node", "server.js", "--config-path", "./config/local.yaml"]);

  assert.equal(document.configPath, "./config/local.yaml");
});
