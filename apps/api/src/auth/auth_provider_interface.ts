import type { AppDatabaseInterface } from "../db/app_database_interface.ts";
import type { AuthenticatedUserInterface } from "./authenticated_user_interface.ts";
import type { AuthSessionInterface } from "./auth_session_interface.ts";
import type { SignInInputInterface } from "./sign_in_input_interface.ts";
import type { SignUpInputInterface } from "./sign_up_input_interface.ts";

/**
 * Defines the smallest auth-provider surface the API depends on so selection remains config-driven.
 */
export interface AuthProviderInterface {
  readonly name: "companyhelm" | "supabase";
  authenticateBearerToken(db: AppDatabaseInterface, token: string): Promise<AuthenticatedUserInterface>;
  signUp?(db: AppDatabaseInterface, input: SignUpInputInterface): Promise<AuthSessionInterface>;
  signIn?(db: AppDatabaseInterface, input: SignInInputInterface): Promise<AuthSessionInterface>;
}
