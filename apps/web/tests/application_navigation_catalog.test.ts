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
        items: ["Chats", "Inbox"],
        label: null,
      },
      {
        items: ["Dashboard", "Agent Conversations", "Tasks", "Usage"],
        label: "Operate",
      },
      {
        items: ["Workflows"],
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

test("adds platform admin destinations only for platform admins", () => {
  const nonAdminGroups = ApplicationNavigationCatalog.buildMainGroups({
    isComputeProvidersEnabled: true,
  });
  const adminGroups = ApplicationNavigationCatalog.buildMainGroups({
    isComputeProvidersEnabled: true,
    isPlatformAdmin: true,
  });

  assert.equal(nonAdminGroups.some((group) => group.label === "Platform"), false);
  assert.deepEqual(
    adminGroups.find((group) => group.label === "Platform")?.items.map((item) => ({
      label: item.label,
      to: item.to,
    })),
    [{
      label: "Admin",
      to: "/admin",
    }, {
      label: "LLM Credentials",
      to: "/model-provider-credentials",
    }, {
      label: "Users",
      to: "/admin/users",
    }, {
      label: "Companies",
      to: "/admin/companies",
    }],
  );
  assert.equal(
    adminGroups.find((group) => group.label === "Agent")?.items.some((item) => item.to === "/model-provider-credentials"),
    false,
  );
});

test("keeps platform admin sidebar destinations unique across groups", () => {
  const groups = ApplicationNavigationCatalog.buildMainGroups({
    isComputeProvidersEnabled: true,
    isPlatformAdmin: true,
  });
  const destinations = groups.flatMap((group) => group.items.map((item) => item.to));

  assert.equal(new Set(destinations).size, destinations.length);
});
