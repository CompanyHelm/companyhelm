import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import type { ConfigLoader } from "../src/config/loader.ts";
import type { AppConfigDocument } from "../src/config/schema.ts";
import { PasswordService } from "../src/auth/providers/companyhelm/password_service.ts";
import { AuthProviderFactory } from "../src/auth/providers/auth_provider_factory.ts";
import { SignInThrottleRegistry } from "../src/auth/providers/companyhelm/sign_in_throttle_registry.ts";
import { JwtService } from "../src/auth/providers/companyhelm/jwt_service.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

/**
 * Builds the small mock fixtures needed to exercise the provider without leaking helper functions.
 */
class CompanyhelmAuthProviderTestHarness {
  static createConfigMock(): Pick<ConfigLoader<AppConfigDocument>, "getDocument"> {
    return {
      getDocument() {
        return {
          auth: {
            provider: "companyhelm",
            companyhelm: {
              jwt_private_key_pem: privateKey,
              jwt_public_key_pem: publicKey,
              jwt_issuer: "companyhelm.local",
              jwt_audience: "companyhelm-web",
              jwt_expiration_seconds: 3600,
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

test.beforeEach(() => {
  SignInThrottleRegistry.resetForTests();
});

test("companyhelm auth provider rejects unknown users with a generic sign-in failure", async () => {
  const provider = AuthProviderFactory.createAuthProvider(CompanyhelmAuthProviderTestHarness.createConfigMock());
  const db = {
    select() {
      return CompanyhelmAuthProviderTestHarness.createMockSelectChain([]);
    },
  };

  await assert.rejects(
    provider.signIn?.(db as never, {
      email: "missing@example.com",
      password: "abc123!",
    }),
    /Invalid email or password\./,
  );
});

test("companyhelm auth provider signs in a matching local user", async () => {
  const provider = AuthProviderFactory.createAuthProvider(CompanyhelmAuthProviderTestHarness.createConfigMock());
  const storedPassword = PasswordService.createPasswordHash("abc123!");
  let selectCallCount = 0;
  const db = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return CompanyhelmAuthProviderTestHarness.createMockSelectChain([{
          id: "user-1",
          email: "user@example.com",
          first_name: "User",
          last_name: "One",
        }]);
      }

      return CompanyhelmAuthProviderTestHarness.createMockSelectChain([{
        password_hash: storedPassword.passwordHash,
        password_salt: storedPassword.passwordSalt,
      }]);
    },
  };

  const session = await provider.signIn?.(db as never, {
    email: "user@example.com",
    password: "abc123!",
  });

  assert.equal(session?.user.id, "user-1");
  assert.equal(session?.user.provider, "companyhelm");
  assert.equal(typeof session?.token, "string");
});

test("companyhelm auth provider throttles repeated failed attempts", async () => {
  const provider = AuthProviderFactory.createAuthProvider(CompanyhelmAuthProviderTestHarness.createConfigMock());
  const db = {
    select() {
      return CompanyhelmAuthProviderTestHarness.createMockSelectChain([]);
    },
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(
      provider.signIn?.(db as never, {
        email: "missing@example.com",
        password: "abc123!",
      }),
      /Invalid email or password\./,
    );
  }

  await assert.rejects(
    provider.signIn?.(db as never, {
      email: "missing@example.com",
      password: "abc123!",
    }),
    /Too many sign-in attempts\. Please try again later\./,
  );
});

test("companyhelm auth provider signs up a new user and stores password credentials", async () => {
  const provider = AuthProviderFactory.createAuthProvider(CompanyhelmAuthProviderTestHarness.createConfigMock());
  const insertedValues: unknown[] = [];
  const tx = {
    select() {
      return CompanyhelmAuthProviderTestHarness.createMockSelectChain([]);
    },
    insert(_table: unknown) {
      return {
        values(value: Record<string, unknown>) {
          insertedValues.push(value);
          return {
            async returning() {
              return [{
                id: "user-2",
                email: "new@example.com",
                first_name: "New",
                last_name: null,
              }];
            },
          };
        },
      };
    },
  };
  const db = {
    async transaction<T>(callback: (database: typeof tx) => Promise<T>) {
      return callback(tx);
    },
  };

  const session = await provider.signUp?.(db as never, {
    email: "new@example.com",
    firstName: "New",
    password: "Passw0rd!",
  });

  assert.equal(session?.user.id, "user-2");
  assert.equal(insertedValues.length, 2);
});

test("companyhelm auth provider authenticates a valid bearer token", async () => {
  const provider = AuthProviderFactory.createAuthProvider(CompanyhelmAuthProviderTestHarness.createConfigMock());
  const token = JwtService.signRs256Jwt({
    payload: {
      sub: "user-1",
      email: "user@example.com",
      first_name: "User",
      last_name: "One",
      provider: "companyhelm",
    },
    privateKeyPem: privateKey,
    issuer: "companyhelm.local",
    audience: "companyhelm-web",
    expiresInSeconds: 3600,
  });

  const authenticatedUser = await provider.authenticateBearerToken({} as never, token);

  assert.deepEqual(authenticatedUser, {
    id: "user-1",
    email: "user@example.com",
    firstName: "User",
    lastName: "One",
    provider: "companyhelm",
    providerSubject: "user-1",
  });
});
