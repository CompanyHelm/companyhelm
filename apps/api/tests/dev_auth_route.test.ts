import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { DevAuthRoute } from "../src/server/dev_auth_route.ts";

class DevAuthRouteTestHarness {
  static createConfig(provider: "local" | "dev"): Config {
    return {
      auth: provider === "dev"
        ? {
          dev: {},
          provider: "dev",
        }
        : {
          local: {
            password_pepper: "",
            session_duration_hours: 168,
            session_issuer: "companyhelm.local",
            session_secret: "local-session-secret",
          },
          provider: "local",
        },
    } as Config;
  }
}

test("DevAuthRoute exposes the dev user browser and user loading endpoints", async () => {
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
        email?: string;
        userId?: string;
      }) {
        return {
          companies: [{
            id: "company-1",
            name: "Acme",
            slug: "acme",
          }],
          user: {
            email: input.email || "dev@example.com",
            firstName: "Dev",
            id: input.userId || "user-1",
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
  const emailResponse = await app.inject({
    method: "GET",
    query: {
      email: "dev@example.com",
    },
    url: "/auth/dev/user",
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
  assert.equal(emailResponse.statusCode, 200);
  assert.equal(JSON.parse(emailResponse.body).user.email, "dev@example.com");

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
    DevAuthRouteTestHarness.createConfig("local"),
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
