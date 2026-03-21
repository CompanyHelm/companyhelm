import { createSign, createVerify } from "node:crypto";

type JwtHeader = {
  alg?: string;
  typ?: string;
  [key: string]: unknown;
};

type JwtPayload = Record<string, unknown>;

type VerifyJwtOptions = {
  issuer: string;
  audience: string;
};

/**
 * Encapsulates the small RS256 JWT surface used by the API so callers depend on one documented class.
 */
export class JwtService {
  static signRs256Jwt(params: {
    payload: JwtPayload;
    privateKeyPem: string;
    issuer: string;
    audience: string;
    expiresInSeconds: number;
  }): string {
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      ...params.payload,
      iss: params.issuer,
      aud: params.audience,
      iat: nowEpochSeconds,
      exp: nowEpochSeconds + params.expiresInSeconds,
    };

    const encodedHeader = JwtService.encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const encodedPayload = JwtService.encodeBase64Url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = createSign("RSA-SHA256")
      .update(signingInput)
      .end()
      .sign(params.privateKeyPem, "base64url");

    return `${signingInput}.${signature}`;
  }

  static verifyRs256Jwt(params: {
    token: string;
    publicKeyPem: string;
    issuer: string;
    audience: string;
  }): JwtPayload {
    const parsed = JwtService.parseToken(params.token);
    if (parsed.header.alg !== "RS256") {
      throw new Error("JWT algorithm is not RS256.");
    }

    const isValid = createVerify("RSA-SHA256")
      .update(parsed.signingInput)
      .end()
      .verify(params.publicKeyPem, parsed.signature, "base64url");

    if (!isValid) {
      throw new Error("JWT signature verification failed.");
    }

    JwtService.ensureValidClaims(parsed.payload, {
      issuer: params.issuer,
      audience: params.audience,
    });
    return parsed.payload;
  }

  private static encodeBase64Url(value: string | Buffer): string {
    return Buffer.from(value).toString("base64url");
  }

  private static decodeBase64Url(value: string): string {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  private static parseToken(token: string): {
    header: JwtHeader;
    payload: JwtPayload;
    signature: string;
    signingInput: string;
  } {
    const normalizedToken = String(token || "").trim();
    const tokenParts = normalizedToken.split(".");
    if (tokenParts.length !== 3) {
      throw new Error("JWT must contain exactly 3 segments.");
    }

    const [encodedHeader, encodedPayload, signature] = tokenParts;
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new Error("JWT segments cannot be empty.");
    }

    let header: JwtHeader;
    try {
      header = JSON.parse(JwtService.decodeBase64Url(encodedHeader)) as JwtHeader;
    } catch {
      throw new Error("JWT header is not valid JSON.");
    }

    let payload: JwtPayload;
    try {
      payload = JSON.parse(JwtService.decodeBase64Url(encodedPayload)) as JwtPayload;
    } catch {
      throw new Error("JWT payload is not valid JSON.");
    }

    return {
      header,
      payload,
      signature,
      signingInput: `${encodedHeader}.${encodedPayload}`,
    };
  }

  private static ensureValidClaims(payload: JwtPayload, options: VerifyJwtOptions) {
    const nowEpochSeconds = Math.floor(Date.now() / 1000);

    const issuer = String(payload.iss || "").trim();
    if (!issuer || issuer !== options.issuer) {
      throw new Error("JWT issuer is invalid.");
    }

    const audience = payload.aud;
    if (typeof audience === "string") {
      if (audience !== options.audience) {
        throw new Error("JWT audience is invalid.");
      }
    } else if (Array.isArray(audience)) {
      if (!audience.includes(options.audience)) {
        throw new Error("JWT audience is invalid.");
      }
    } else {
      throw new Error("JWT audience is missing.");
    }

    const expiration = Number(payload.exp);
    if (!Number.isFinite(expiration) || expiration <= nowEpochSeconds) {
      throw new Error("JWT is expired.");
    }

    const issuedAt = Number(payload.iat);
    if (!Number.isFinite(issuedAt) || issuedAt > nowEpochSeconds + 60) {
      throw new Error("JWT issued-at value is invalid.");
    }
  }
}
