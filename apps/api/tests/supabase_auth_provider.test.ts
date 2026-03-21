import assert from "node:assert/strict";
import test from "node:test";
import type { Config } from "../src/config/config.ts";
import type { AppConfigDocument } from "../src/config/schema.ts";
import { AuthProviderFactory } from "../src/auth/providers/auth_provider_factory.ts";

/**
 * Creates the minimal Supabase auth fixtures needed to exercise the provider and factory behavior.
 */
class SupabaseAuthProviderTestHarness {
  static createConfigMock(): Pick<Config<AppConfigDocument>, "getDocument"> {
    return {
      getDocument() {
        return {
          auth: {
            provider: "supabase",
            supabase: {
              url: "https://example.supabase.co",
              anon_key: "anon-key",
            },
          },
        } as AppConfigDocument;
      },
    };
  }

  static createMockSelectChain(result: unknown[]) {
    return {
      from() {
        return {
          where() {
            return {
              limit: async () => result,
            };
          },
        };
      },
    };
  }
}

test("supabase auth provider authenticates a bearer token and resolves a local user by subject id", async () => {
  const provider = AuthProviderFactory.createAuthProvider(
    SupabaseAuthProviderTestHarness.createConfigMock(),
    {
      supabaseJwtVerifier: {
        async verify() {
          return {
            sub: "supabase-user-1",
            email: "user@example.com",
          };
        },
      },
    },
  );
  const db = {
    select() {
      return SupabaseAuthProviderTestHarness.createMockSelectChain([{
        id: "supabase-user-1",
        email: "user@example.com",
        first_name: "User",
        last_name: "Example",
      }]);
    },
  };

  const authenticatedUser = await provider.authenticateBearerToken(db as never, "supabase-token");

  assert.deepEqual(authenticatedUser, {
    id: "supabase-user-1",
    email: "user@example.com",
    firstName: "User",
    lastName: "Example",
    provider: "supabase",
    providerSubject: "supabase-user-1",
  });
});

test("supabase auth provider falls back to matching a local user by email", async () => {
  const provider = AuthProviderFactory.createAuthProvider(
    SupabaseAuthProviderTestHarness.createConfigMock(),
    {
      supabaseJwtVerifier: {
        async verify() {
          return {
            sub: "supabase-user-2",
            email: "user@example.com",
          };
        },
      },
    },
  );
  const db = {
    select() {
      return SupabaseAuthProviderTestHarness.createMockSelectChain([{
        id: "local-user-9",
        email: "user@example.com",
        first_name: "Local",
        last_name: null,
      }]);
    },
  };

  const authenticatedUser = await provider.authenticateBearerToken(db as never, "supabase-token");

  assert.deepEqual(authenticatedUser, {
    id: "local-user-9",
    email: "user@example.com",
    firstName: "Local",
    lastName: null,
    provider: "supabase",
    providerSubject: "supabase-user-2",
  });
});

test("supabase auth provider rejects verified tokens for users that are not provisioned locally", async () => {
  const provider = AuthProviderFactory.createAuthProvider(
    SupabaseAuthProviderTestHarness.createConfigMock(),
    {
      supabaseJwtVerifier: {
        async verify() {
          return {
            sub: "supabase-user-3",
            email: "missing@example.com",
          };
        },
      },
    },
  );
  const db = {
    select() {
      return SupabaseAuthProviderTestHarness.createMockSelectChain([]);
    },
  };

  await assert.rejects(
    provider.authenticateBearerToken(db as never, "supabase-token"),
    /Supabase user is not provisioned locally\./,
  );
});
