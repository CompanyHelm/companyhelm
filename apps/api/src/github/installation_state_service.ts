import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";

type SerializedGithubInstallationState = {
  algorithm: "aes-256-gcm";
  ciphertext: string;
  iv: string;
  tag: string;
};

type GithubInstallationStateEnvelope = {
  encryptedState: string;
  keyId: string;
};

type GithubInstallationStateValue = {
  companyId: string;
  issuedAt: string;
  organizationSlug: string;
  userId: string;
};

export type GithubInstallationState = GithubInstallationStateValue & {
  keyId: string;
};

/**
 * Encrypts GitHub installation callback state with the application encryption key while carrying a
 * dedicated GitHub key identifier in the serialized state so future rotations can distinguish old
 * callback payloads from newly minted ones.
 */
@injectable()
export class GithubInstallationStateService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private readonly config: Config;

  constructor(@inject(Config) config: Config) {
    this.config = config;
  }

  createState(params: {
    companyId: string;
    organizationSlug: string;
    userId: string;
  }): string {
    const stateValue: GithubInstallationStateValue = {
      companyId: this.requireValue(params.companyId, "GitHub installation state company id"),
      issuedAt: new Date().toISOString(),
      organizationSlug: this.requireValue(
        params.organizationSlug,
        "GitHub installation state organization slug",
      ),
      userId: this.requireValue(params.userId, "GitHub installation state user id"),
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      GithubInstallationStateService.ALGORITHM,
      this.resolveKeyBytes(this.resolveKeyId()),
      iv,
    );
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(stateValue), "utf8"),
      cipher.final(),
    ]);
    const serializedValue: SerializedGithubInstallationState = {
      algorithm: GithubInstallationStateService.ALGORITHM,
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
    };
    const envelope: GithubInstallationStateEnvelope = {
      encryptedState: JSON.stringify(serializedValue),
      keyId: this.resolveKeyId(),
    };

    return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
  }

  readState(state: string): GithubInstallationState {
    const normalizedState = this.requireValue(state, "GitHub installation state");
    const serializedEnvelope = Buffer.from(normalizedState, "base64url").toString("utf8");
    const envelope = JSON.parse(serializedEnvelope) as GithubInstallationStateEnvelope;
    const keyId = this.requireValue(envelope.keyId, "GitHub installation state key id");
    const serializedValue = JSON.parse(envelope.encryptedState) as SerializedGithubInstallationState;
    if (serializedValue.algorithm !== GithubInstallationStateService.ALGORITHM) {
      throw new Error("Unsupported GitHub installation state algorithm.");
    }

    const decipher = createDecipheriv(
      GithubInstallationStateService.ALGORITHM,
      this.resolveKeyBytes(keyId),
      Buffer.from(serializedValue.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(serializedValue.tag, "base64"));

    const decryptedValue = Buffer.concat([
      decipher.update(Buffer.from(serializedValue.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const stateValue = JSON.parse(decryptedValue) as GithubInstallationStateValue;

    return {
      companyId: this.requireValue(stateValue.companyId, "GitHub installation state company id"),
      issuedAt: this.requireValue(stateValue.issuedAt, "GitHub installation state issuedAt"),
      keyId,
      organizationSlug: this.requireValue(
        stateValue.organizationSlug,
        "GitHub installation state organization slug",
      ),
      userId: this.requireValue(stateValue.userId, "GitHub installation state user id"),
    };
  }

  private resolveKeyId(): string {
    return this.config.github.key_id ?? this.config.security.encryption.key_id;
  }

  private resolveKeyBytes(keyId: string): Buffer {
    if (keyId !== this.resolveKeyId()) {
      throw new Error(`Unknown GitHub installation state key id: ${keyId}`);
    }

    return createHash("sha256")
      .update(this.config.security.encryption.key, "utf8")
      .digest();
  }

  private requireValue(value: string, label: string): string {
    const normalizedValue = String(value || "").trim();
    if (normalizedValue.length === 0) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }
}
