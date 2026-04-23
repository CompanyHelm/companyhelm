import type { ReactNode } from "react";
import { useContext } from "react";
import { CompanyHelmAuthContext } from "@/auth/companyhelm_auth";
import { config } from "@/config";
import {
  CompanyHelmClerkProvider,
  ClerkOrganizationList,
  ClerkOrganizationSwitcher,
  ClerkSignIn,
  ClerkSignUp,
  ClerkUserButton,
} from "./clerk_provider";
import {
  CompanyHelmLocalProvider,
  LocalOrganizationList,
  LocalOrganizationSwitcher,
  LocalSignIn,
  LocalSignUp,
  LocalUserButton,
} from "./local_provider";

/**
 * Selects the runtime auth implementation and exposes a provider-neutral hook/component surface to
 * the rest of the web app.
 */
export function CompanyHelmAuthProvider(props: {
  children: ReactNode;
}) {
  return config.authProvider === "local"
    ? <CompanyHelmLocalProvider>{props.children}</CompanyHelmLocalProvider>
    : <CompanyHelmClerkProvider>{props.children}</CompanyHelmClerkProvider>;
}

export function useAuth() {
  return useCompanyHelmAuthContext().auth;
}

export function useUser() {
  return useCompanyHelmAuthContext().user;
}

export function useOrganization() {
  return useCompanyHelmAuthContext().organization;
}

export function useOrganizationList(options?: unknown) {
  void options;
  return useCompanyHelmAuthContext().organizationList;
}

export function OrganizationSwitcher(props: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
}) {
  void props.afterCreateOrganizationUrl;
  void props.afterSelectOrganizationUrl;
  return config.authProvider === "local"
    ? <LocalOrganizationSwitcher />
    : <ClerkOrganizationSwitcher {...props} />;
}

export function OrganizationList(props: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
  hidePersonal?: boolean;
}) {
  void props.afterCreateOrganizationUrl;
  void props.afterSelectOrganizationUrl;
  void props.hidePersonal;
  return config.authProvider === "local"
    ? <LocalOrganizationList />
    : <ClerkOrganizationList {...props} />;
}

export function SignIn(props: {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signUpUrl?: string;
}) {
  return config.authProvider === "local"
    ? <LocalSignIn />
    : <ClerkSignIn {...props} />;
}

export function SignUp(props: {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signInUrl?: string;
}) {
  return config.authProvider === "local"
    ? <LocalSignUp />
    : <ClerkSignUp {...props} />;
}

export function UserButton() {
  return config.authProvider === "local"
    ? <LocalUserButton />
    : <ClerkUserButton />;
}

function useCompanyHelmAuthContext() {
  const context = useContext(CompanyHelmAuthContext);
  if (!context) {
    throw new Error("CompanyHelm auth context is unavailable.");
  }

  return context;
}
