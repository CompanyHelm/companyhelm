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
  CompanyHelmDevProvider,
  DevCompanies,
  DevOrganizationList,
  DevOrganizationSwitcher,
  DevSignIn,
  DevSignUp,
  DevUserButton,
} from "./dev_provider";
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
  if (config.authProvider === "local") {
    return <CompanyHelmLocalProvider>{props.children}</CompanyHelmLocalProvider>;
  }

  if (config.authProvider === "dev") {
    return <CompanyHelmDevProvider>{props.children}</CompanyHelmDevProvider>;
  }

  return <CompanyHelmClerkProvider>{props.children}</CompanyHelmClerkProvider>;
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
  createOrganizationMode?: "modal" | "navigation";
  createOrganizationUrl?: string;
  organizationProfileMode?: "modal" | "navigation";
  organizationProfileUrl?: string;
}) {
  void props.afterCreateOrganizationUrl;
  void props.afterSelectOrganizationUrl;
  void props.createOrganizationMode;
  void props.createOrganizationUrl;
  void props.organizationProfileMode;
  void props.organizationProfileUrl;
  return config.authProvider === "local"
    ? <LocalOrganizationSwitcher />
    : config.authProvider === "dev"
      ? <DevOrganizationSwitcher />
    : <ClerkOrganizationSwitcher {...(props as never as Record<string, unknown>)} />;
}

export function OrganizationList(props: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
  createOrganizationMode?: "modal" | "navigation";
  createOrganizationUrl?: string;
  hidePersonal?: boolean;
}) {
  void props.afterCreateOrganizationUrl;
  void props.afterSelectOrganizationUrl;
  void props.createOrganizationMode;
  void props.createOrganizationUrl;
  void props.hidePersonal;
  return config.authProvider === "local"
    ? <LocalOrganizationList />
    : config.authProvider === "dev"
      ? <DevOrganizationList />
    : <ClerkOrganizationList {...props} />;
}

export function SignIn(props: {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signUpUrl?: string;
}) {
  return config.authProvider === "local"
    ? <LocalSignIn />
    : config.authProvider === "dev"
      ? <DevSignIn />
    : <ClerkSignIn {...props} />;
}

export function SignUp(props: {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signInUrl?: string;
}) {
  return config.authProvider === "local"
    ? <LocalSignUp />
    : config.authProvider === "dev"
      ? <DevSignUp />
    : <ClerkSignUp {...props} />;
}

export function Companies() {
  return config.authProvider === "dev"
    ? <DevCompanies />
    : null;
}

export function UserButton() {
  return config.authProvider === "local"
    ? <LocalUserButton />
    : config.authProvider === "dev"
      ? <DevUserButton />
    : <ClerkUserButton />;
}

function useCompanyHelmAuthContext() {
  const context = useContext(CompanyHelmAuthContext);
  if (!context) {
    throw new Error("CompanyHelm auth context is unavailable.");
  }

  return context;
}
