import { and, eq } from "drizzle-orm";
import type { Config } from "../../config/schema.ts";
import { companies, companyMembers, userAuths, users } from "../../db/schema.ts";
import {
  AuthProvider,
  type AuthenticateBearerTokenHeaders,
  type AuthenticatedUser,
  type AuthProviderDatabase,
  type AuthSession,
  type SignInInput,
  type SignUpInput,
} from "../auth_provider.ts";
import { PasswordService } from "./password_service.ts";
import { SignInThrottleRegistry } from "./sign_in_throttle_registry.ts";
import { JwtService } from "./jwt_service.ts";

type UserRecord = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
};

type CompanyRecord = {
  id: string;
  name: string;
};

/**
 * Implements the local CompanyHelm auth flow using only config-selected behavior and password records.
 */
export class CompanyhelmAuthProvider extends AuthProvider {
  readonly name = "companyhelm" as const;
  private readonly config: NonNullable<Config["auth"]["companyhelm"]>;
  private readonly dummySignInPasswordRecord = PasswordService.createPasswordHash("CompanyHelm!1");

  constructor(config: NonNullable<Config["auth"]["companyhelm"]>) {
    super();
    this.config = {
      ...config,
      jwt_private_key_pem: CompanyhelmAuthProvider.normalizePem(config.jwt_private_key_pem),
      jwt_public_key_pem: CompanyhelmAuthProvider.normalizePem(config.jwt_public_key_pem),
    };
  }

  async authenticateBearerToken(
    db: AuthProviderDatabase,
    token: string,
    headers: AuthenticateBearerTokenHeaders = {},
  ): Promise<AuthSession> {
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
    const companyId = CompanyhelmAuthProvider.normalizeCompanyIdHeader(headers["x-company-id"]);
    const [company] = await db
      .select({
        id: companies.id,
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1) as CompanyRecord[];
    if (!company) {
      throw new Error("Requested company was not found.");
    }

    const [membership] = await db
      .select({
        companyId: companyMembers.companyId,
        userId: companyMembers.userId,
      })
      .from(companyMembers)
      .where(and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, userId),
      ))
      .limit(1) as Array<{ companyId: string; userId: string }>;
    if (!membership) {
      throw new Error("Authenticated user is not a member of the requested company.");
    }

    return {
      token,
      user: this.toAuthenticatedUser({
        id: userId,
        email,
        first_name: firstName,
        last_name: normalizedLastName || null,
      }, userId),
      company: {
        id: company.id,
        name: company.name,
      },
    };
  }

  async signUp(db: AuthProviderDatabase, input: SignUpInput): Promise<AuthSession> {
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const normalizedEmail = CompanyhelmAuthProvider.normalizeEmail(input.email);
    const normalizedFirstName = CompanyhelmAuthProvider.normalizeFirstName(input.firstName);
    const normalizedLastName = CompanyhelmAuthProvider.normalizeLastName(input.lastName);
    const normalizedPassword = PasswordService.validatePasswordPolicy(input.password);

    const createdUser = await db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1) as Array<{ id: string }>;
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
        .returning?.({
          id: users.id,
          email: users.email,
          first_name: users.first_name,
          last_name: users.last_name,
        }) as Promise<UserRecord[]>;

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

  async signIn(db: AuthProviderDatabase, input: SignInInput): Promise<AuthSession> {
    const normalizedEmail = CompanyhelmAuthProvider.normalizeEmail(input.email);
    if (SignInThrottleRegistry.isSignInThrottled(normalizedEmail)) {
      throw new Error("Too many sign-in attempts. Please try again later.");
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
      .limit(1) as UserRecord[];

    if (!existingUser) {
      PasswordService.verifyPasswordHash({
        rawPassword: input.password,
        passwordHash: this.dummySignInPasswordRecord.passwordHash,
        passwordSalt: this.dummySignInPasswordRecord.passwordSalt,
      });
      SignInThrottleRegistry.recordFailedSignInAttempt(normalizedEmail);
      throw new Error("Invalid email or password.");
    }

    const [userAuth] = await db
      .select({
        password_hash: userAuths.password_hash,
        password_salt: userAuths.password_salt,
      })
      .from(userAuths)
      .where(eq(userAuths.user_id, existingUser.id))
      .limit(1) as Array<{ password_hash: string; password_salt: string }>;

    if (!userAuth) {
      PasswordService.verifyPasswordHash({
        rawPassword: input.password,
        passwordHash: this.dummySignInPasswordRecord.passwordHash,
        passwordSalt: this.dummySignInPasswordRecord.passwordSalt,
      });
      SignInThrottleRegistry.recordFailedSignInAttempt(normalizedEmail);
      throw new Error("Invalid email or password.");
    }

    const isValidPassword = PasswordService.verifyPasswordHash({
      rawPassword: input.password,
      passwordHash: userAuth.password_hash,
      passwordSalt: userAuth.password_salt,
    });
    if (!isValidPassword) {
      SignInThrottleRegistry.recordFailedSignInAttempt(normalizedEmail);
      throw new Error("Invalid email or password.");
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
      user: this.toAuthenticatedUser(user, user.id),
      company: null,
    };
  }

  private toAuthenticatedUser(user: UserRecord, providerSubject: string): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      provider: "companyhelm",
      providerSubject,
    };
  }

  private static normalizeEmail(rawEmail: string): string {
    const normalizedEmail = String(rawEmail || "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("A valid email is required.");
    }
    return normalizedEmail;
  }

  private static normalizeFirstName(rawFirstName: string): string {
    const normalizedFirstName = String(rawFirstName || "").trim();
    if (!normalizedFirstName) {
      throw new Error("First name is required.");
    }
    return normalizedFirstName;
  }

  private static normalizeLastName(rawLastName: string | null | undefined): string | null {
    const normalizedLastName = String(rawLastName || "").trim();
    return normalizedLastName || null;
  }

  private static normalizePem(rawPem: string): string {
    return String(rawPem || "").trim().replace(/\\n/g, "\n");
  }

  private static normalizeCompanyIdHeader(rawCompanyIdHeader: unknown): string {
    const normalizedCompanyIdHeader = String(
      Array.isArray(rawCompanyIdHeader) ? rawCompanyIdHeader[0] : rawCompanyIdHeader,
    ).trim();
    if (!normalizedCompanyIdHeader) {
      throw new Error("Missing x-company-id header.");
    }

    return normalizedCompanyIdHeader;
  }
}
