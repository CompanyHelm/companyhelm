import { decodeProtectedHeader, exportSPKI, importJWK, type JWK } from "jose";
import type { Config } from "../../config/schema.ts";

type ClerkJwksDocument = {
  keys: JWK[];
};

/**
 * Loads the active Clerk JWT verification key from the configured JWKS endpoint and converts it to PEM.
 */
export class ClerkJwtKeyLoader {
  private readonly jwksUrl: string;

  constructor(config: NonNullable<Config["auth"]["clerk"]>) {
    this.jwksUrl = config.jwks_url;
  }

  async load(token: string): Promise<string> {
    const keyId = this.resolveKeyId(token);
    const jwksDocument = await this.fetchJwksDocument();
    const jwk = this.selectJwk(jwksDocument.keys, keyId);
    const publicKey = await importJWK(jwk, "RS256");
    return exportSPKI(publicKey);
  }

  private resolveKeyId(token: string): string | null {
    const protectedHeader = decodeProtectedHeader(token);
    const keyId = String(protectedHeader.kid || "").trim();
    return keyId || null;
  }

  private async fetchJwksDocument(): Promise<ClerkJwksDocument> {
    const response = await fetch(this.jwksUrl, {
      headers: {
        accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch Clerk JWKS.");
    }

    const document = await response.json() as Partial<ClerkJwksDocument>;
    if (!Array.isArray(document.keys) || document.keys.length === 0) {
      throw new Error("Clerk JWKS endpoint returned no keys.");
    }

    return {
      keys: document.keys,
    };
  }

  private selectJwk(keys: JWK[], keyId: string | null): JWK {
    if (keyId) {
      const matchingKey = keys.find((key) => String(key.kid || "").trim() === keyId);
      if (matchingKey) {
        return matchingKey;
      }
    }

    const signingKey = keys.find((key) => {
      const use = String(key.use || "").trim();
      return key.kty === "RSA" && (!use || use === "sig");
    });
    if (signingKey) {
      return signingKey;
    }

    throw new Error("Clerk JWKS endpoint returned no RSA signing key.");
  }
}
