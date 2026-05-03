import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { DemoRunScript } from "../scripts/demo/run.ts";

test("DemoRunScript requires a scenario path", async () => {
  const script = new DemoRunScript();

  await assert.rejects(
    script.readScriptPath(["node", "scripts/demo/run.ts"]),
    /demo:run requires a script path/,
  );
});

test("DemoRunScript resolves an existing scenario path", async () => {
  const script = new DemoRunScript();
  const directory = new URL("./tmp-demo-run", import.meta.url);
  const file = new URL("./tmp-demo-run/example.ts", import.meta.url);

  await mkdir(directory, { recursive: true });
  await writeFile(file, "export {};\n");

  try {
    const resolvedPath = await script.readScriptPath([
      "node",
      "scripts/demo/run.ts",
      "tests/tmp-demo-run/example.ts",
    ]);

    assert.match(resolvedPath, /tests\/tmp-demo-run\/example\.ts$/);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
