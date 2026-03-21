import type { AuthenticatedUserInterface } from "./authenticated_user_interface.ts";

/**
 * Represents the complete result of a local auth mutation: issued token plus normalized user state.
 */
export interface AuthSessionInterface {
  token: string;
  user: AuthenticatedUserInterface;
}
