import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";

type SerializedEncryptedSecret = {
  algorithm: "aes-256-gcm";
  ciphertext: string;
  iv: string;
  tag: string;
};

type EncryptedSecretPayload = {
  encryptedValue: string;
  encryptionKeyId: string;
};

/**
 * Encrypts and decrypts persisted company secrets with the configured application key. It keeps
 * key-version handling centralized so future key rotation only needs to extend this one class.
 */
@injectable()
export class SecretEncryptionService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private readonly config: Config;

  constructor(@inject(Config) config: Config) {
    this.config = config;
  }

  encrypt(value: string): EncryptedSecretPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      SecretEncryptionService.ALGORITHM,
      this.resolveKeyBytes(this.config.security.encryption.key_id),
      iv,
    );
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    const serializedValue: SerializedEncryptedSecret = {
      algorithm: SecretEncryptionService.ALGORITHM,
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
    };

    return {
      encryptedValue: JSON.stringify(serializedValue),
      encryptionKeyId: this.config.security.encryption.key_id,
    };
  }

  decrypt(encryptedValue: string, encryptionKeyId: string): string {
    const serializedValue = JSON.parse(encryptedValue) as SerializedEncryptedSecret;
    if (serializedValue.algorithm !== SecretEncryptionService.ALGORITHM) {
      throw new Error("Unsupported secret encryption algorithm.");
    }

    const decipher = createDecipheriv(
      SecretEncryptionService.ALGORITHM,
      this.resolveKeyBytes(encryptionKeyId),
      Buffer.from(serializedValue.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(serializedValue.tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(serializedValue.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }

  private resolveKeyBytes(encryptionKeyId: string): Buffer {
    if (encryptionKeyId !== this.config.security.encryption.key_id) {
      throw new Error(`Unknown encryption key id: ${encryptionKeyId}`);
    }

    return createHash("sha256")
      .update(this.config.security.encryption.key, "utf8")
      .digest();
  }
}
