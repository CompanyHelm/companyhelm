import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { ClerkOrganizationSlugResolver } from "../src/auth/clerk/organization_slug_resolver.ts";

function createConfigMock() {
  return {
    auth: {
      provider: "clerk",
      clerk: {
        publishable_key: "pk_test_example",
        secret_key: "sk_test_example",
      },
    },
  } as never;
}

function createTransactionProvider(clerkOrganizationId: string | null) {
  return {
    async transaction(callback: (tx: unknown) => Promise<unknown>) {
      return callback({
        select() {
          return {
            from() {
              return {
                where() {
                  return {
                    async limit() {
                      return [{
                        clerkOrganizationId,
                      }];
                    },
                  };
                },
              };
            },
          };
        },
      });
    },
  };
}

test("ClerkOrganizationSlugResolver loads the company Clerk organization and returns its live slug", async () => {
  const getOrganization = vi.fn().mockResolvedValue({
    slug: "acme-live",
  });
  const resolver = ClerkOrganizationSlugResolver.createForTest(
    createConfigMock(),
    {
      organizations: {
        getOrganization,
      },
    },
  );

  const slug = await resolver.resolveForCompany(
    createTransactionProvider("org_clerk_123") as never,
    "company-123",
  );

  assert.equal(slug, "acme-live");
  assert.deepEqual(getOrganization.mock.calls, [[{
    organizationId: "org_clerk_123",
  }]]);
});

test("ClerkOrganizationSlugResolver rejects companies without a Clerk organization id", async () => {
  const resolver = ClerkOrganizationSlugResolver.createForTest(
    createConfigMock(),
    {
      organizations: {
        getOrganization: vi.fn(),
      },
    },
  );

  await assert.rejects(
    resolver.resolveForCompany(createTransactionProvider(null) as never, "company-123"),
    /Company is not linked to a Clerk organization/,
  );
});

test("ClerkOrganizationSlugResolver rejects Clerk organizations without a slug", async () => {
  const resolver = ClerkOrganizationSlugResolver.createForTest(
    createConfigMock(),
    {
      organizations: {
        getOrganization: vi.fn().mockResolvedValue({
          slug: "",
        }),
      },
    },
  );

  await assert.rejects(
    resolver.resolveForCompany(createTransactionProvider("org_clerk_123") as never, "company-123"),
    /Clerk organization slug is required/,
  );
});
