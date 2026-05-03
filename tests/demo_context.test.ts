import assert from "node:assert/strict";
import { test } from "node:test";
import { DemoContext } from "../scripts/demo/context.ts";

test("DemoContext resolves localhost defaults and seeded organization paths", () => {
  delete process.env.DEMO_API_URL;
  delete process.env.DEMO_ORGANIZATION_SLUG;
  delete process.env.DEMO_WEB_URL;

  const context = new DemoContext();

  assert.equal(context.apiUrl(), "http://localhost:4000");
  assert.equal(context.webUrl(), "http://localhost:5173");
  assert.equal(context.organizationSlug(), "companyhelm-local");
  assert.equal(context.organizationPath("/skills"), "/orgs/companyhelm-local/skills");
  assert.equal(
    context.resolveWebUrl(context.organizationPath("/skills")),
    "http://localhost:5173/orgs/companyhelm-local/skills",
  );
});

test("DemoContext respects explicit demo URL overrides", () => {
  process.env.DEMO_API_URL = "https://api.example.test/";
  process.env.DEMO_ORGANIZATION_SLUG = "demo-org";
  process.env.DEMO_WEB_URL = "https://web.example.test/";

  const context = new DemoContext();

  assert.equal(context.apiUrl(), "https://api.example.test");
  assert.equal(context.webUrl(), "https://web.example.test");
  assert.equal(context.organizationSlug(), "demo-org");
  assert.equal(context.organizationPath("tasks"), "/orgs/demo-org/tasks");
});
