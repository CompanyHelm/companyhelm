import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import type { AppConfig } from "../config/config.ts";
import { signRs256Jwt } from "./jwt.ts";
import { createPasswordHash } from "./password.ts";
import { createAuthProvider } from "./provider.ts";
import { resetSignInThrottleStateForTests } from "./sign-in-throttle.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

function createMockSelectChain(result: unknown[]) {
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

function createConfigMock(): AppConfig {
  return {
    authProvider: "companyhelm",
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
  } as AppConfig;
}

test.beforeEach(() => {
  resetSignInThrottleStateForTests();
});

test("companyhelm auth provider rejects unknown users with a generic sign-in failure", async () => {
  const provider = createAuthProvider(createConfigMock());
  const db = {
    select() {
      return createMockSelectChain([]);
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
  const provider = createAuthProvider(createConfigMock());
  const storedPassword = createPasswordHash("abc123!");
  let selectCallCount = 0;
  const db = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return createMockSelectChain([{
          id: "user-1",
          email: "user@example.com",
          first_name: "User",
          last_name: "One",
          auth_provider: "companyhelm",
        }]);
      }

      return createMockSelectChain([{
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
  const provider = createAuthProvider(createConfigMock());
  const db = {
    select() {
      return createMockSelectChain([]);
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
  const provider = createAuthProvider(createConfigMock());
  const insertedValues: unknown[] = [];
  const tx = {
    select() {
      return createMockSelectChain([]);
    },
    insert(_table: unknown) {
      return {
        values(value: unknown) {
          insertedValues.push(value);
          return {
            async returning() {
              return [{
                id: "user-2",
                email: "new@example.com",
                first_name: "New",
                last_name: null,
                auth_provider: "companyhelm",
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
  const provider = createAuthProvider(createConfigMock());
  const token = signRs256Jwt({
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
