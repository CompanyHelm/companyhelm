import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationNavigationCatalog } from "../src/components/layout/application_navigation_catalog";

test("builds the approved sidebar group structure when compute providers are enabled", () => {
  const groups = ApplicationNavigationCatalog.buildMainGroups({
    isComputeProvidersEnabled: true,
  });

  assert.deepEqual(
    groups.map((group) => ({
      items: group.items.map((item) => item.label),
      label: group.label,
    })),
    [
      {
        items: ["Dashboard", "Inbox", "Chats", "Agent Conversations", "Tasks"],
        label: "Operate",
      },
      {
        items: ["Routines", "Workflows"],
        label: "Automation",
      },
      {
        items: [
          "Agents",
          "Skills",
          "Model Credentials",
          "Secrets",
          "MCP Servers",
          "Environments",
          "Compute Providers",
        ],
        label: "Agent",
      },
      {
        items: ["Repositories", "Knowledge Base"],
        label: "Sources",
      },
    ],
  );
});

test("omits compute providers when the feature flag is disabled", () => {
  const groups = ApplicationNavigationCatalog.buildMainGroups({
    isComputeProvidersEnabled: false,
  });

  assert.deepEqual(
    groups.find((group) => group.label === "Agent")?.items.map((item) => item.label),
    ["Agents", "Skills", "Model Credentials", "Secrets", "MCP Servers", "Environments"],
  );
});

test("keeps every sidebar destination unique across groups", () => {
  const groups = ApplicationNavigationCatalog.buildMainGroups({
    isComputeProvidersEnabled: true,
  });
  const destinations = groups.flatMap((group) => group.items.map((item) => item.to));

  assert.equal(new Set(destinations).size, destinations.length);
});
