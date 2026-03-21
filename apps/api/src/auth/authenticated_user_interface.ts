/**
 * Describes the normalized user payload returned by auth flows and bearer-token authentication.
 */
export interface AuthenticatedUserInterface {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  provider: "companyhelm" | "supabase";
  providerSubject: string;
}
