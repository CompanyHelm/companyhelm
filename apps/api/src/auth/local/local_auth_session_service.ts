import { inject, injectable } from "inversify";
import { jwtVerify, SignJWT } from "jose";
import { Config } from "../../config/schema.ts";

export type LocalAuthTokenClaims = {
  companyId: string;
  sessionId: string;
  userId: string;
};

/**
 * Signs and verifies local auth bearer tokens so the web app can use the same Authorization header
 * flow as Clerk-backed sessions while the database retains revocation control.
 */
@injectable()
export class LocalAuthSessionService {
  private readonly config: Extract<Config["auth"], {
    provider: "local";
  }> | null;

  constructor(@inject(Config) config: Config) {
    this.config = config.auth.provider === "local" ? config.auth : null;
  }

  async createSessionToken(input: LocalAuthTokenClaims): Promise<string> {
    const config = this.requireLocalConfig();
    return new SignJWT({
      companyId: input.companyId,
      sessionId: input.sessionId,
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setExpirationTime(`${config.local.session_duration_hours}h`)
      .setIssuedAt()
      .setIssuer(config.local.session_issuer)
      .setJti(input.sessionId)
      .setSubject(input.userId)
      .sign(this.resolveSecret());
  }

  async verifySessionToken(token: string): Promise<LocalAuthTokenClaims> {
    const config = this.requireLocalConfig();
    const verifiedToken = await jwtVerify(token, this.resolveSecret(), {
      issuer: config.local.session_issuer,
    });
    const companyId = String(verifiedToken.payload.companyId || "").trim();
    const sessionId = String(verifiedToken.payload.sessionId || verifiedToken.payload.jti || "").trim();
    const userId = String(verifiedToken.payload.sub || "").trim();

    if (!companyId || !sessionId || !userId) {
      throw new Error("Local auth session token is missing required claims.");
    }

    return {
      companyId,
      sessionId,
      userId,
    };
  }

  private resolveSecret(): Uint8Array {
    return new TextEncoder().encode(this.requireLocalConfig().local.session_secret);
  }

  private requireLocalConfig(): Extract<Config["auth"], {
    provider: "local";
  }> {
    if (!this.config) {
      throw new Error("Local auth session service requires local auth configuration.");
    }

    return this.config;
  }
}
