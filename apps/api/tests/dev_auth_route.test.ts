import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { DevAuthRoute } from "../src/server/dev_auth_route.ts";

class DevAuthRouteTestHarness {
  static createConfig(provider: "clerk" | "dev"): Config {
    return {
      auth: provider === "dev"
        ? {
          dev: {
            session_duration_hours: 168,
            session_issuer: "companyhelm.dev",
            session_secret: "dev-session-secret",
          },
          provider: "dev",
        }
        : {
          clerk: {
            authorized_parties: ["http://localhost:5173"],
            jwks_url: "https://clerk.example/.well-known/jwks.json",
            publishable_key: "pk_test_local",
            secret_key: "sk_test_local",
          },
          provider: "clerk",
        },
    } as Config;
  }
}

test("DevAuthRoute exposes the dev user browser and sign-in endpoints", async () => {
  const app = Fastify();
  const route = new DevAuthRoute(
    DevAuthRouteTestHarness.createConfig("dev"),
    {
      async listUsers() {
        return [{
          email: "dev@example.com",
          firstName: "Dev",
          hasActiveCompany: true,
          id: "user-1",
          lastName: "User",
          primaryCompanyName: "Acme",
          primaryCompanySlug: "acme",
        }];
      },
      async loadUser(input: {
        userId: string;
      }) {
        return {
          companies: [{
            id: "company-1",
            name: "Acme",
            slug: "acme",
          }],
          user: {
            email: "dev@example.com",
            firstName: "Dev",
            id: input.userId,
            lastName: "User",
          },
        };
      },
      async signIn(input: {
        companyId?: string;
        email?: string;
        userId?: string;
      }) {
        return {
          activeOrganizationId: input.companyId || "company-1",
          organizations: [{
            id: input.companyId || "company-1",
            name: input.companyId === "company-2" ? "Beta" : "Acme",
            slug: input.companyId === "company-2" ? "beta" : "acme",
          }],
          token: input.companyId === "company-2"
            ? "token-2"
            : input.email === "dev@example.com"
              ? "token-1"
              : "token-3",
          user: {
            email: "dev@example.com",
            firstName: "Dev",
            id: "user-1",
            isPlatformAdmin: false,
            lastName: "User",
          },
        };
      },
      async signUp() {
        throw new Error("signUp should not be called.");
      },
      async createCompany() {
        throw new Error("createCompany should not be called.");
      },
      async loadSession() {
        throw new Error("loadSession should not be called.");
      },
      async signOut() {
        throw new Error("signOut should not be called.");
      },
    } as never,
  );
  route.register(app);

  const usersResponse = await app.inject({
    method: "GET",
    url: "/auth/dev/users",
  });
  const userResponse = await app.inject({
    method: "GET",
    query: {
      userId: "user-1",
    },
    url: "/auth/dev/user",
  });
  const signInResponse = await app.inject({
    method: "POST",
    payload: {
      companyId: "company-2",
      userId: "user-1",
    },
    url: "/auth/dev/sign-in",
  });

  assert.equal(usersResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(usersResponse.body), {
    users: [{
      email: "dev@example.com",
      firstName: "Dev",
      hasActiveCompany: true,
      id: "user-1",
      lastName: "User",
      primaryCompanyName: "Acme",
      primaryCompanySlug: "acme",
    }],
  });
  assert.equal(userResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(userResponse.body), {
    companies: [{
      id: "company-1",
      name: "Acme",
      slug: "acme",
    }],
    user: {
      email: "dev@example.com",
      firstName: "Dev",
      id: "user-1",
      lastName: "User",
    },
  });
  assert.equal(signInResponse.statusCode, 200);
  assert.equal(JSON.parse(signInResponse.body).token, "token-2");

  await app.close();
});

test("DevAuthRoute exposes the user creation and company creation endpoints", async () => {
  const app = Fastify();
  const route = new DevAuthRoute(
    DevAuthRouteTestHarness.createConfig("dev"),
    {
      async listUsers() {
        throw new Error("listUsers should not be called.");
      },
      async signIn() {
        throw new Error("signIn should not be called.");
      },
      async loadUser() {
        throw new Error("loadUser should not be called.");
      },
      async signUp(input: {
        email: string;
        firstName: string;
        lastName?: string;
      }) {
        return {
          companies: [],
          user: {
            email: input.email,
            firstName: input.firstName,
            id: "user-3",
            lastName: input.lastName || null,
          },
        };
      },
      async createCompany(input: {
        companyName: string;
        userId: string;
      }) {
        return {
          companies: [{
            id: "company-2",
            name: input.companyName,
            slug: "new-co",
          }],
          user: {
            email: "existing@example.com",
            firstName: "Existing",
            id: input.userId,
            lastName: "User",
          },
        };
      },
      async loadSession() {
        throw new Error("loadSession should not be called.");
      },
      async signOut() {
        throw new Error("signOut should not be called.");
      },
    } as never,
  );
  route.register(app);

  const signUpResponse = await app.inject({
    method: "POST",
    payload: {
      email: "new@example.com",
      firstName: "New",
      lastName: "Person",
    },
    url: "/auth/dev/sign-up",
  });
  const createCompanyResponse = await app.inject({
    method: "POST",
    payload: {
      companyName: "New Co",
      userId: "user-2",
    },
    url: "/auth/dev/create-company",
  });

  assert.equal(signUpResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(signUpResponse.body), {
    companies: [],
    user: {
      email: "new@example.com",
      firstName: "New",
      id: "user-3",
      lastName: "Person",
    },
  });
  assert.equal(createCompanyResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(createCompanyResponse.body), {
    companies: [{
      id: "company-2",
      name: "New Co",
      slug: "new-co",
    }],
    user: {
      email: "existing@example.com",
      firstName: "Existing",
      id: "user-2",
      lastName: "User",
    },
  });

  await app.close();
});

test("DevAuthRoute skips registration when dev auth is disabled", async () => {
  const app = Fastify();
  const route = new DevAuthRoute(
    DevAuthRouteTestHarness.createConfig("clerk"),
    {
      async listUsers() {
        throw new Error("listUsers should not be called.");
      },
      async loadUser() {
        throw new Error("loadUser should not be called.");
      },
    } as never,
  );
  route.register(app);

  const response = await app.inject({
    method: "GET",
    url: "/auth/dev/users",
  });

  assert.equal(response.statusCode, 404);

  await app.close();
});
