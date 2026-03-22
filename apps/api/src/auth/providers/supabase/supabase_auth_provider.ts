import { eq, or } from "drizzle-orm";
import type { ConfigDocument } from "../../../config/schema.ts";
import { users } from "../../../db/schema.ts";
import {
  type AuthenticatedUser,
  type AuthProviderDatabase,
  type AuthProviderInterface,
} from "../auth_provider_interface.ts";
import { SupabaseJwtVerifier } from "./supabase_jwt_verifier.ts";

type UserRecord = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
};

/**
 * Authenticates Supabase bearer tokens and maps them onto an already-provisioned local user record.
 */
export class SupabaseAuthProvider implements AuthProviderInterface {
  readonly name = "supabase" as const;
  private readonly jwtVerifier: Pick<SupabaseJwtVerifier, "verify">;

  constructor(
    config: NonNullable<ConfigDocument["auth"]["supabase"]>,
    dependencies: {
      supabaseJwtVerifier?: Pick<SupabaseJwtVerifier, "verify">;
    } = {},
  ) {
    this.jwtVerifier = dependencies.supabaseJwtVerifier ?? new SupabaseJwtVerifier({
      projectUrl: config.url,
    });
  }

  async authenticateBearerToken(db: AuthProviderDatabase, token: string): Promise<AuthenticatedUser> {
    const claims = await this.jwtVerifier.verify(token);
    const providerSubject = String(claims.sub || "").trim();
    if (!providerSubject) {
      throw new Error("Supabase bearer token is missing a subject.");
    }

    const normalizedEmail = this.normalizeEmail(String(claims.email || ""));
    const [localUser] = await db
      .select({
        id: users.id,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(users)
      .where(
        or(
          eq(users.id, providerSubject),
          eq(users.email, normalizedEmail),
        ),
      )
      .limit(1) as UserRecord[];

    if (!localUser) {
      throw new Error("Supabase user is not provisioned locally.");
    }

    return {
      id: localUser.id,
      email: localUser.email,
      firstName: localUser.first_name,
      lastName: localUser.last_name,
      provider: "supabase",
      providerSubject,
    };
  }

  private normalizeEmail(rawEmail: string): string {
    const normalizedEmail = String(rawEmail || "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Supabase bearer token is missing a valid email.");
    }
    return normalizedEmail;
  }
}
