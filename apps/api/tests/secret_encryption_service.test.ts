import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { SecretEncryptionService } from "../src/services/secrets/encryption.ts";

test("SecretEncryptionService encrypts and decrypts values with the configured key id", () => {
  const encryptionService = new SecretEncryptionService({
    security: {
      encryption: {
        key: "companyhelm-test-encryption-key",
        key_id: "companyhelm-test-key",
      },
    },
  } as Config);

  const encryptedSecret = encryptionService.encrypt("super-secret-value");

  assert.equal(encryptedSecret.encryptionKeyId, "companyhelm-test-key");
  assert.notEqual(encryptedSecret.encryptedValue, "super-secret-value");
  assert.equal(
    encryptionService.decrypt(encryptedSecret.encryptedValue, encryptedSecret.encryptionKeyId),
    "super-secret-value",
  );
});
