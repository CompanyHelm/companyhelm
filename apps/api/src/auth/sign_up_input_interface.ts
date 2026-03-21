/**
 * Defines the local sign-up payload needed to create a CompanyHelm-backed user account.
 */
export interface SignUpInputInterface {
  email: string;
  firstName: string;
  lastName?: string | null;
  password: string;
}
