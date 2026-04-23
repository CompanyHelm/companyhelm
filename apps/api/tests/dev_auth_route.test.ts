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
      async signIn(input: {
        email?: string;
        userId?: string;
      }) {
        return {
          activeOrganizationId: "company-1",
          organizations: [{
            id: "company-1",
            name: "Acme",
            slug: "acme",
          }],
          token: input.email === "dev@example.com" ? "token-1" : "token-2",
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
  const signInResponse = await app.inject({
    method: "POST",
    payload: {
      email: "dev@example.com",
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
  assert.equal(signInResponse.statusCode, 200);
  assert.equal(JSON.parse(signInResponse.body).token, "token-1");

  await app.close();
});

test("DevAuthRoute exposes the company creation endpoint", async () => {
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
      async signUp() {
        throw new Error("signUp should not be called.");
      },
      async createCompany(input: {
        companyName: string;
        email?: string;
        userId?: string;
      }) {
        return {
          activeOrganizationId: "company-2",
          organizations: [{
            id: "company-2",
            name: input.companyName,
            slug: "new-co",
          }],
          token: input.userId === "user-2" ? "token-2" : "token-3",
          user: {
            email: "existing@example.com",
            firstName: "Existing",
            id: "user-2",
            isPlatformAdmin: false,
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

  const response = await app.inject({
    method: "POST",
    payload: {
      companyName: "New Co",
      userId: "user-2",
    },
    url: "/auth/dev/create-company",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).token, "token-2");

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
