import { eq } from "drizzle-orm";
import type { AppConfig } from "../config/loader.ts";
import type { AppDatabase } from "../db/client.ts";
import { userAuths, users } from "../db/schema.ts";
import { JwtService } from "./jwt.ts";
import { PasswordService } from "./password.ts";
import { SignInThrottleRegistry } from "./sign-in-throttle.ts";

export type AuthProviderName = "companyhelm" | "supabase";

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  provider: AuthProviderName;
  providerSubject: string;
}

export interface AuthSession {
  token: string;
  user: AuthenticatedUser;
}

export interface SignUpInput {
  email: string;
  firstName: string;
  lastName?: string | null;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthProvider {
  name: AuthProviderName;
  authenticateBearerToken(db: AppDatabase, token: string): Promise<AuthenticatedUser>;
  signUp?(db: AppDatabase, input: SignUpInput): Promise<AuthSession>;
  signIn?(db: AppDatabase, input: SignInInput): Promise<AuthSession>;
}

type UserRecord = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
};

type CompanyhelmAuthConfig = NonNullable<ReturnType<AppConfig["getDocument"]>["auth"]["companyhelm"]>;

const SIGN_IN_FAILURE_MESSAGE = "Invalid email or password.";
const SIGN_IN_THROTTLED_MESSAGE = "Too many sign-in attempts. Please try again later.";
const DUMMY_SIGN_IN_PASSWORD_RECORD = PasswordService.createPasswordHash("CompanyHelm!1");

/**
 * Keeps auth-provider-specific value normalization in one place instead of spreading string handling
 * across the provider implementation.
 */
class CompanyhelmAuthValueNormalizer {
  static normalizeEmail(rawEmail: string): string {
    const normalizedEmail = String(rawEmail || "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("A valid email is required.");
    }
    return normalizedEmail;
  }

  static normalizeFirstName(rawFirstName: string): string {
    const normalizedFirstName = String(rawFirstName || "").trim();
    if (!normalizedFirstName) {
      throw new Error("First name is required.");
    }
    return normalizedFirstName;
  }

  static normalizeLastName(rawLastName: string | null | undefined): string | null {
    const normalizedLastName = String(rawLastName || "").trim();
    return normalizedLastName || null;
  }

  static normalizePem(rawPem: string): string {
    return String(rawPem || "").trim().replace(/\\n/g, "\n");
  }
}

/**
 * Converts database-shaped user records into the transport shape the auth surface returns.
 */
class AuthenticatedUserMapper {
  static toAuthenticatedUser(params: {
    user: UserRecord;
    provider: AuthProviderName;
    providerSubject: string;
  }): AuthenticatedUser {
    return {
      id: params.user.id,
      email: params.user.email,
      firstName: params.user.first_name,
      lastName: params.user.last_name,
      provider: params.provider,
      providerSubject: params.providerSubject,
    };
  }
}

class CompanyhelmAuthProvider implements AuthProvider {
  public readonly name: AuthProviderName = "companyhelm";
  private readonly config: CompanyhelmAuthConfig;

  constructor(config: CompanyhelmAuthConfig) {
    this.config = {
      ...config,
      jwt_private_key_pem: CompanyhelmAuthValueNormalizer.normalizePem(config.jwt_private_key_pem),
      jwt_public_key_pem: CompanyhelmAuthValueNormalizer.normalizePem(config.jwt_public_key_pem),
    };
  }

  async authenticateBearerToken(_db: AppDatabase, token: string): Promise<AuthenticatedUser> {
    const payload = JwtService.verifyRs256Jwt({
      token,
      publicKeyPem: this.config.jwt_public_key_pem,
      issuer: this.config.jwt_issuer,
      audience: this.config.jwt_audience,
    });

    const userId = String(payload.sub || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const firstName = String(payload.first_name || "").trim();
    const normalizedLastName = String(payload.last_name || "").trim();
    if (!userId || !email || !firstName) {
      throw new Error("JWT payload is missing user claims.");
    }

    return AuthenticatedUserMapper.toAuthenticatedUser({
      user: {
        id: userId,
        email,
        first_name: firstName,
        last_name: normalizedLastName || null,
      },
      provider: "companyhelm",
      providerSubject: userId,
    });
  }

  async signUp(db: AppDatabase, input: SignUpInput): Promise<AuthSession> {
    const normalizedEmail = CompanyhelmAuthValueNormalizer.normalizeEmail(input.email);
    const normalizedFirstName = CompanyhelmAuthValueNormalizer.normalizeFirstName(input.firstName);
    const normalizedLastName = CompanyhelmAuthValueNormalizer.normalizeLastName(input.lastName);
    const normalizedPassword = PasswordService.validatePasswordPolicy(input.password);

    const createdUser = await db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existingUser) {
        throw new Error("User already exists.");
      }

      const now = new Date();
      const [newUser] = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          created_at: now,
          updated_at: now,
        })
        .returning({
          id: users.id,
          email: users.email,
          first_name: users.first_name,
          last_name: users.last_name,
        });

      if (!newUser) {
        throw new Error("Failed to create user.");
      }

      const { passwordSalt, passwordHash } = PasswordService.createPasswordHash(normalizedPassword);
      await tx.insert(userAuths).values({
        user_id: newUser.id,
        email: normalizedEmail,
        password_salt: passwordSalt,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
      });

      return newUser;
    });

    return this.issueSession(createdUser);
  }

  async signIn(db: AppDatabase, input: SignInInput): Promise<AuthSession> {
    const normalizedEmail = CompanyhelmAuthValueNormalizer.normalizeEmail(input.email);
    if (SignInThrottleRegistry.isSignInThrottled(normalizedEmail)) {
      throw new Error(SIGN_IN_THROTTLED_MESSAGE);
    }

    const [existingUser] = await db
      .select({
        id: users.id,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!existingUser) {
      PasswordService.verifyPasswordHash({
        rawPassword: input.password,
        passwordHash: DUMMY_SIGN_IN_PASSWORD_RECORD.passwordHash,
        passwordSalt: DUMMY_SIGN_IN_PASSWORD_RECORD.passwordSalt,
      });
      SignInThrottleRegistry.recordFailedSignInAttempt(normalizedEmail);
      throw new Error(SIGN_IN_FAILURE_MESSAGE);
    }

    const [userAuth] = await db
      .select({
        password_hash: userAuths.password_hash,
        password_salt: userAuths.password_salt,
      })
      .from(userAuths)
      .where(eq(userAuths.user_id, existingUser.id))
      .limit(1);

    if (!userAuth) {
      PasswordService.verifyPasswordHash({
        rawPassword: input.password,
        passwordHash: DUMMY_SIGN_IN_PASSWORD_RECORD.passwordHash,
        passwordSalt: DUMMY_SIGN_IN_PASSWORD_RECORD.passwordSalt,
      });
      SignInThrottleRegistry.recordFailedSignInAttempt(normalizedEmail);
      throw new Error(SIGN_IN_FAILURE_MESSAGE);
    }

    const isValidPassword = PasswordService.verifyPasswordHash({
      rawPassword: input.password,
      passwordHash: userAuth.password_hash,
      passwordSalt: userAuth.password_salt,
    });
    if (!isValidPassword) {
      SignInThrottleRegistry.recordFailedSignInAttempt(normalizedEmail);
      throw new Error(SIGN_IN_FAILURE_MESSAGE);
    }

    SignInThrottleRegistry.clearSignInThrottle(normalizedEmail);
    return this.issueSession(existingUser);
  }

  private issueSession(user: UserRecord): AuthSession {
    const token = JwtService.signRs256Jwt({
      payload: {
        sub: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        provider: "companyhelm",
      },
      privateKeyPem: this.config.jwt_private_key_pem,
      issuer: this.config.jwt_issuer,
      audience: this.config.jwt_audience,
      expiresInSeconds: this.config.jwt_expiration_seconds,
    });

    return {
      token,
      user: AuthenticatedUserMapper.toAuthenticatedUser({
        user,
        provider: "companyhelm",
        providerSubject: user.id,
      }),
    };
  }
}

/**
 * Keeps provider selection config-driven and isolates header parsing from transport code.
 */
export class AuthProviderFactory {
  static createAuthProvider(config: AppConfig): AuthProvider {
    if (config.authProvider !== "companyhelm") {
      throw new Error("Only the companyhelm auth provider is implemented.");
    }

    const companyhelmConfig = config.auth.companyhelm;
    if (!companyhelmConfig) {
      throw new Error("CompanyHelm auth provider requires auth.companyhelm configuration.");
    }

    return new CompanyhelmAuthProvider(companyhelmConfig);
  }

  static extractBearerToken(authorizationHeader: unknown): string | null {
    const normalizedAuthorizationHeader = AuthProviderFactory.normalizeAuthorizationHeader(authorizationHeader).trim();
    if (!normalizedAuthorizationHeader) {
      return null;
    }

    const [scheme, token] = normalizedAuthorizationHeader.split(/\s+/, 2);
    if (String(scheme || "").toLowerCase() !== "bearer") {
      return null;
    }

    const normalizedToken = String(token || "").trim();
    return normalizedToken || null;
  }

  private static normalizeAuthorizationHeader(authorizationHeader: unknown): string {
    if (typeof authorizationHeader === "string") {
      return authorizationHeader;
    }

    if (Array.isArray(authorizationHeader)) {
      return String(authorizationHeader[0] || "");
    }

    return "";
  }
}
