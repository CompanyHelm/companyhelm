import assert from "node:assert/strict";
import { test, vi } from "vitest";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { CreateCompanyMutation } from "../src/graphql/mutations/create_company.ts";
import { FreeCompanyCreationEligibilityQueryResolver } from "../src/graphql/resolvers/free_company_creation_eligibility.ts";
import { CompanyCreationService } from "../src/services/company_creation/service.ts";

/**
 * Exercises the free-company creation limit through the service and GraphQL entry points so the
 * displayed eligibility and mutation enforcement both receive the user's platform-admin status.
 */
class CompanyCreationLimitsTestHarness {
  static createContext(isPlatformAdmin: boolean): GraphqlRequestContext {
    return {
      authSession: {
        company: null,
        token: "jwt-token",
        user: {
          id: "user-1",
          email: "admin@example.com",
          firstName: "Admin",
          isPlatformAdmin,
          lastName: null,
          provider: "clerk",
          providerSubject: "user_clerk_1",
        },
      },
      resolveSubscriptionContext: null,
    };
  }

  static createServiceForCount(count: string): CompanyCreationService {
    const sql = vi.fn(async () => [{ count }]) as unknown as <T>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => Promise<T>;

    return new CompanyCreationService({} as never, {
      getSqlClient() {
        return sql;
      },
    } as never);
  }

  static createServiceForCompanyCreation() {
    const unsafeCalls: Array<{
      parameters?: unknown[];
      query: string;
    }> = [];
    const transaction = {
      unsafe: vi.fn(async (query: string, parameters?: unknown[]) => {
        unsafeCalls.push({
          parameters,
          query,
        });
        if (query.includes("select count(*)::text as count")) {
          return [{ count: "0" }];
        }
        if (query.includes("select id") && query.includes("where slug = $1")) {
          return [];
        }
        if (query.includes("insert into companies")) {
          return [{
            id: String(parameters?.[0] ?? ""),
            slug: String(parameters?.[2] ?? ""),
          }];
        }
        if (query.includes("insert into company_members")) {
          return [];
        }
        if (query.includes("update companies")) {
          return [{ clerk_organization_id: null }];
        }

        return [];
      }),
    };
    const sql = {
      begin: vi.fn(async (callback: (transaction: typeof transaction) => Promise<unknown>) => callback(transaction)),
    };
    const service = new CompanyCreationService({
      auth: {
        provider: "local",
      },
    } as never, {
      getSqlClient() {
        return sql;
      },
    } as never);

    return {
      service,
      unsafeCalls,
    };
  }
}

test("CompanyCreationService allows platform admins up to one thousand active free companies", async () => {
  const service = CompanyCreationLimitsTestHarness.createServiceForCount("999");

  assert.deepEqual(await service.getFreeCompanyCreationEligibility({
    isPlatformAdmin: true,
    userId: "user-1",
  }), {
    allowed: true,
    currentFreeCompanyCount: 999,
    limit: 1000,
    reason: null,
  });
});

test("CompanyCreationService keeps the standard three active free company limit for non-admins", async () => {
  const service = CompanyCreationLimitsTestHarness.createServiceForCount("3");

  assert.deepEqual(await service.getFreeCompanyCreationEligibility({
    isPlatformAdmin: false,
    userId: "user-1",
  }), {
    allowed: false,
    currentFreeCompanyCount: 3,
    limit: 3,
    reason: "Free accounts can belong to at most 3 free companies.",
  });
});

test("FreeCompanyCreationEligibilityQueryResolver forwards platform admin status to the service", async () => {
  const getFreeCompanyCreationEligibility = vi.fn(async () => ({
    allowed: true,
    currentFreeCompanyCount: 999,
    limit: 1000,
    reason: null,
  }));
  const resolver = new FreeCompanyCreationEligibilityQueryResolver({
    getFreeCompanyCreationEligibility,
  } as never);

  await resolver.execute(null, {}, CompanyCreationLimitsTestHarness.createContext(true));

  assert.deepEqual(getFreeCompanyCreationEligibility.mock.calls[0], [{
    isPlatformAdmin: true,
    userId: "user-1",
  }]);
});

test("CreateCompanyMutation forwards platform admin status to company creation", async () => {
  const createCompany = vi.fn(async () => ({
    clerkOrganizationId: "org_clerk_1",
    id: "company-1",
    name: "Acme",
    slug: "acme",
  }));
  const mutation = new CreateCompanyMutation({
    createCompany,
  } as never);

  await mutation.execute(null, {
    input: {
      name: "Acme",
    },
  }, CompanyCreationLimitsTestHarness.createContext(true));

  assert.deepEqual(createCompany.mock.calls[0], [{
    clerkUserId: "user_clerk_1",
    isPlatformAdmin: true,
    name: "Acme",
    userId: "user-1",
  }]);
});

test("CompanyCreationService supplies an id when creating companies through raw SQL", async () => {
  const harness = CompanyCreationLimitsTestHarness.createServiceForCompanyCreation();

  const company = await harness.service.createCompany({
    clerkUserId: null,
    isPlatformAdmin: false,
    name: "Acme",
    userId: "user-1",
  });

  const insertCompanyCall = harness.unsafeCalls.find((call) => call.query.includes("insert into companies"));
  assert.match(insertCompanyCall?.query ?? "", /insert into companies \(id, name, slug, plan\)/u);
  assert.equal(typeof insertCompanyCall?.parameters?.[0], "string");
  assert.notEqual(insertCompanyCall?.parameters?.[0], "");
  assert.deepEqual(insertCompanyCall?.parameters?.slice(1), ["Acme", "acme"]);
  assert.equal(company.id, insertCompanyCall?.parameters?.[0]);
});
