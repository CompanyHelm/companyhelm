import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { inject, injectable } from "inversify";
import { Config } from "../../../config/schema.ts";

type SerializedMcpOauthState = {
  algorithm: "aes-256-gcm";
  ciphertext: string;
  iv: string;
  tag: string;
};

type McpOauthStateEnvelope = {
  encryptedState: string;
  keyId: string;
};

type McpOauthStateValue = {
  companyId: string;
  issuedAt: string;
  mcpServerId: string;
  organizationSlug: string;
  sessionId: string;
  userId: string;
};

export type McpOauthState = McpOauthStateValue & {
  keyId: string;
};

@injectable()
export class McpOauthStateService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private readonly config: Config;

  constructor(@inject(Config) config: Config) {
    this.config = config;
  }

  createState(params: {
    companyId: string;
    mcpServerId: string;
    organizationSlug: string;
    sessionId: string;
    userId: string;
  }): string {
    const stateValue: McpOauthStateValue = {
      companyId: this.requireValue(params.companyId, "MCP OAuth state company id"),
      issuedAt: new Date().toISOString(),
      mcpServerId: this.requireValue(params.mcpServerId, "MCP OAuth state MCP server id"),
      organizationSlug: this.requireValue(params.organizationSlug, "MCP OAuth state organization slug"),
      sessionId: this.requireValue(params.sessionId, "MCP OAuth state session id"),
      userId: this.requireValue(params.userId, "MCP OAuth state user id"),
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      McpOauthStateService.ALGORITHM,
      this.resolveKeyBytes(this.resolveKeyId()),
      iv,
    );
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(stateValue), "utf8"),
      cipher.final(),
    ]);

    const envelope: McpOauthStateEnvelope = {
      encryptedState: JSON.stringify({
        algorithm: McpOauthStateService.ALGORITHM,
        ciphertext: ciphertext.toString("base64"),
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
      } satisfies SerializedMcpOauthState),
      keyId: this.resolveKeyId(),
    };

    return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
  }

  readState(state: string): McpOauthState {
    const normalizedState = this.requireValue(state, "MCP OAuth state");
    const serializedEnvelope = Buffer.from(normalizedState, "base64url").toString("utf8");
    const envelope = JSON.parse(serializedEnvelope) as McpOauthStateEnvelope;
    const keyId = this.requireValue(envelope.keyId, "MCP OAuth state key id");
    const serializedValue = JSON.parse(envelope.encryptedState) as SerializedMcpOauthState;
    if (serializedValue.algorithm !== McpOauthStateService.ALGORITHM) {
      throw new Error("Unsupported MCP OAuth state algorithm.");
    }

    const decipher = createDecipheriv(
      McpOauthStateService.ALGORITHM,
      this.resolveKeyBytes(keyId),
      Buffer.from(serializedValue.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(serializedValue.tag, "base64"));

    const decryptedValue = Buffer.concat([
      decipher.update(Buffer.from(serializedValue.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const stateValue = JSON.parse(decryptedValue) as McpOauthStateValue;

    return {
      companyId: this.requireValue(stateValue.companyId, "MCP OAuth state company id"),
      issuedAt: this.requireValue(stateValue.issuedAt, "MCP OAuth state issuedAt"),
      keyId,
      mcpServerId: this.requireValue(stateValue.mcpServerId, "MCP OAuth state MCP server id"),
      organizationSlug: this.requireValue(stateValue.organizationSlug, "MCP OAuth state organization slug"),
      sessionId: this.requireValue(stateValue.sessionId, "MCP OAuth state session id"),
      userId: this.requireValue(stateValue.userId, "MCP OAuth state user id"),
    };
  }

  private resolveKeyId(): string {
    return this.config.security.encryption.key_id;
  }

  private resolveKeyBytes(keyId: string): Buffer {
    if (keyId !== this.resolveKeyId()) {
      throw new Error(`Unknown MCP OAuth state key id: ${keyId}`);
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
