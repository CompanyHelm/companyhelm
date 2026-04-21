import assert from "node:assert/strict";
import { test } from "node:test";
import { SecretDefaultOptions } from "../src/pages/agents/secret_default_options";

test("hides default secrets already attached directly or through attached groups", () => {
  const options = new SecretDefaultOptions();
  const availableSecrets = options.filterAvailableSecrets(
    [
      {
        envVarName: "DIRECT_SECRET",
        id: "direct-secret",
        name: "Direct secret",
        secretGroupId: null,
      },
      {
        envVarName: "GROUPED_SECRET",
        id: "grouped-secret",
        name: "Grouped secret",
        secretGroupId: "attached-group",
      },
      {
        envVarName: "OTHER_GROUP_SECRET",
        id: "other-group-secret",
        name: "Other group secret",
        secretGroupId: "other-group",
      },
      {
        envVarName: "UNGROUPED_SECRET",
        id: "ungrouped-secret",
        name: "Ungrouped secret",
      },
    ],
    new Set(["direct-secret"]),
    new Set(["attached-group"]),
  );

  assert.deepEqual(
    availableSecrets.map((secret) => secret.id),
    ["other-group-secret", "ungrouped-secret"],
  );
});
