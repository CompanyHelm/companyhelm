import "reflect-metadata";
import assert from "node:assert/strict";
import { CommanderError } from "commander";
import { test } from "vitest";
import { ApiCli } from "../src/cli/api_cli.ts";

test("ApiCli requires --config-path", () => {
  const cli = new ApiCli();

  assert.throws(
    () => cli.parse(["node", "src/main.ts"]),
    (error: unknown) => error instanceof CommanderError && error.code === "commander.missingMandatoryOptionValue",
  );
});

test("ApiCli returns the provided --config-path", () => {
  const cli = new ApiCli();
  const document = cli.parse(["node", "src/main.ts", "--config-path", "./config/local.yaml"]);

  assert.equal(document.configPath, "./config/local.yaml");
});
