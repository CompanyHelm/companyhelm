import { createSign, createVerify } from "node:crypto";

interface VerifyJwtOptions {
  issuer: string;
  audience: string;
}

type JwtHeader = {
  alg?: string;
  typ?: string;
  [key: string]: unknown;
};

export type JwtPayload = Record<string, unknown>;

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function parseToken(token: string): {
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
    header = JSON.parse(decodeBase64Url(encodedHeader)) as JwtHeader;
  } catch {
    throw new Error("JWT header is not valid JSON.");
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(decodeBase64Url(encodedPayload)) as JwtPayload;
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

function ensureValidClaims(payload: JwtPayload, options: VerifyJwtOptions) {
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

export function signRs256Jwt(params: {
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

  const encodedHeader = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .end()
    .sign(params.privateKeyPem, "base64url");

  return `${signingInput}.${signature}`;
}

export function verifyRs256Jwt(params: {
  token: string;
  publicKeyPem: string;
  issuer: string;
  audience: string;
}): JwtPayload {
  const parsed = parseToken(params.token);
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

  ensureValidClaims(parsed.payload, {
    issuer: params.issuer,
    audience: params.audience,
  });
  return parsed.payload;
}
