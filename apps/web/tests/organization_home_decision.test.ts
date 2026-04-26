import assert from "node:assert/strict";
import test from "node:test";
import { OrganizationHomeDecision } from "../src/pages/root/organization_home_decision";

test("redirects `/` straight into the only company membership", () => {
  const decision = OrganizationHomeDecision.resolve({
    authProvider: "clerk",
    memberships: [
      {
        organization: {
          id: "org_1",
          name: "Acme",
          slug: "acme",
        },
      },
    ],
  });

  assert.deepEqual(decision, {
    kind: "redirect",
    organizationSlug: "acme",
  });
});

test("keeps `/` on the company picker when multiple memberships exist", () => {
  const decision = OrganizationHomeDecision.resolve({
    authProvider: "clerk",
    memberships: [
      {
        organization: {
          id: "org_1",
          name: "Acme",
          slug: "acme",
        },
      },
      {
        organization: {
          id: "org_2",
          name: "Bravo",
          slug: "bravo",
        },
      },
    ],
  });

  assert.deepEqual(decision, {
    kind: "organization-list",
  });
});

test("redirects `/` to the previously selected company when multiple memberships exist", () => {
  const decision = OrganizationHomeDecision.resolve({
    authProvider: "clerk",
    memberships: [
      {
        organization: {
          id: "org_1",
          name: "Acme",
          slug: "acme",
        },
      },
      {
        organization: {
          id: "org_2",
          name: "Bravo",
          slug: "bravo",
        },
      },
    ],
    selectedOrganizationId: "org_2",
  });

  assert.deepEqual(decision, {
    kind: "redirect",
    organizationSlug: "bravo",
  });
});

test("ignores a previously selected company that is no longer available", () => {
  const decision = OrganizationHomeDecision.resolve({
    authProvider: "clerk",
    memberships: [
      {
        organization: {
          id: "org_1",
          name: "Acme",
          slug: "acme",
        },
      },
      {
        organization: {
          id: "org_2",
          name: "Bravo",
          slug: "bravo",
        },
      },
    ],
    selectedOrganizationId: "org_3",
  });

  assert.deepEqual(decision, {
    kind: "organization-list",
  });
});

test("sends dev users without memberships into company creation", () => {
  const decision = OrganizationHomeDecision.resolve({
    authProvider: "dev",
    memberships: [],
  });

  assert.deepEqual(decision, {
    kind: "companies",
  });
});

test("keeps non-dev users without memberships on the organization list flow", () => {
  const decision = OrganizationHomeDecision.resolve({
    authProvider: "clerk",
    memberships: [],
  });

  assert.deepEqual(decision, {
    kind: "organization-list",
  });
});
