import { inject, injectable } from "inversify";
import { jwtVerify, SignJWT } from "jose";
import { Config } from "../../config/schema.ts";

export type LocalAuthTokenClaims = {
  companyId: string;
  sessionId: string;
  userId: string;
};

/**
 * Signs and verifies bearer tokens for the first-party CompanyHelm auth providers so the web app
 * can use one Authorization header flow while the database retains revocation control.
 */
@injectable()
export class LocalAuthSessionService {
  private readonly config: Extract<Config["auth"], {
    provider: "local";
  }> | null;

  constructor(@inject(Config) config: Config) {
    this.config = config.auth.provider === "local"
      ? config.auth
      : null;
  }

  async createSessionToken(input: LocalAuthTokenClaims): Promise<string> {
    const sessionConfig = this.requireSessionConfig();
    return new SignJWT({
      companyId: input.companyId,
      sessionId: input.sessionId,
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setExpirationTime(`${sessionConfig.session_duration_hours}h`)
      .setIssuedAt()
      .setIssuer(sessionConfig.session_issuer)
      .setJti(input.sessionId)
      .setSubject(input.userId)
      .sign(this.resolveSecret());
  }

  async verifySessionToken(token: string): Promise<LocalAuthTokenClaims> {
    const sessionConfig = this.requireSessionConfig();
    const verifiedToken = await jwtVerify(token, this.resolveSecret(), {
      issuer: sessionConfig.session_issuer,
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
    return new TextEncoder().encode(this.requireSessionConfig().session_secret);
  }

  private requireSessionConfig(): {
    session_duration_hours: number;
    session_issuer: string;
    session_secret: string;
  } {
    if (!this.config) {
      throw new Error("CompanyHelm auth session service requires local auth configuration.");
    }

    return this.config.local;
  }
}
