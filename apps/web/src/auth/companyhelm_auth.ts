import { createContext } from "react";

export type CompanyHelmAuthProviderName = "clerk" | "dev" | "local";

export type CompanyHelmOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type CompanyHelmOrganizationMembership = {
  organization: CompanyHelmOrganization;
};

export type CompanyHelmUser = {
  firstName: string;
  id: string;
  lastName: string | null;
  primaryEmailAddress: {
    emailAddress: string;
  };
};

export type CompanyHelmAuthState = {
  getRequestHeaders: () => Promise<Record<string, string>>;
  getToken: () => Promise<string | null>;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
};

export type CompanyHelmUserState = {
  isLoaded: boolean;
  user: CompanyHelmUser | null;
};

export type CompanyHelmOrganizationState = {
  isLoaded: boolean;
  organization: CompanyHelmOrganization | null;
};

export type CompanyHelmOrganizationListState = {
  isLoaded: boolean;
  setActive?: (input: {
    organization: string;
  }) => Promise<void>;
  userMemberships: {
    data: CompanyHelmOrganizationMembership[];
  };
};

export type LocalSignInInput = {
  email: string;
  password: string;
};

export type LocalSignUpInput = {
  companyName: string;
  email: string;
  firstName: string;
  lastName?: string;
  password: string;
};

export type DevSignInInput = {
  companyId: string;
  userId: string;
};

export type DevAuthCompanyDocument = {
  id: string;
  name: string;
  slug: string;
};

export type DevAuthUserDetailDocument = {
  companies: DevAuthCompanyDocument[];
  user: {
    email: string;
    firstName: string;
    id: string;
    lastName: string | null;
  };
};

export type DevSignUpInput = {
  email: string;
  firstName: string;
  lastName?: string;
};

export type DevCreateCompanyInput = {
  companyName: string;
  userId: string;
};

export type CompanyHelmAuthContextValue = {
  auth: CompanyHelmAuthState;
  localAuth: {
    signIn(input: LocalSignInInput): Promise<void>;
    signOut(): Promise<void>;
    signUp(input: LocalSignUpInput): Promise<void>;
  } | null;
  devAuth: {
    createCompany(input: DevCreateCompanyInput): Promise<DevAuthUserDetailDocument>;
    errorMessage?: string | null;
    loadUser(input: {
      email?: string;
      userId?: string;
    }): Promise<DevAuthUserDetailDocument>;
    selectUser(input: {
      userId: string;
    }): Promise<void>;
    signIn(input: DevSignInInput): Promise<void>;
    signOut(): Promise<void>;
    signUp(input: DevSignUpInput): Promise<DevAuthUserDetailDocument>;
  } | null;
  organization: CompanyHelmOrganizationState;
  organizationList: CompanyHelmOrganizationListState;
  provider: CompanyHelmAuthProviderName;
  user: CompanyHelmUserState;
};

export const CompanyHelmAuthContext = createContext<CompanyHelmAuthContextValue | null>(null);
