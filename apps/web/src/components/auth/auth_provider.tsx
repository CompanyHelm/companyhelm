import type { ReactNode } from "react";
import { useContext } from "react";
import { CompanyHelmAuthContext } from "@/auth/companyhelm_auth";
import { config } from "@/config";
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

  return <CompanyHelmLocalProvider>{props.children}</CompanyHelmLocalProvider>;
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
    : <DevOrganizationSwitcher />;
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
    : <DevOrganizationList />;
}

export function SignIn(props: {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signUpUrl?: string;
}) {
  void props.appearance;
  void props.forceRedirectUrl;
  void props.signUpUrl;
  return config.authProvider === "local"
    ? <LocalSignIn />
    : <DevSignIn />;
}

export function SignUp(props: {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signInUrl?: string;
}) {
  void props.appearance;
  void props.forceRedirectUrl;
  void props.signInUrl;
  return config.authProvider === "local"
    ? <LocalSignUp />
    : <DevSignUp />;
}

export function Companies() {
  return config.authProvider === "dev"
    ? <DevCompanies />
    : null;
}

export function UserButton() {
  return config.authProvider === "local"
    ? <LocalUserButton />
    : <DevUserButton />;
}

function useCompanyHelmAuthContext() {
  const context = useContext(CompanyHelmAuthContext);
  if (!context) {
    throw new Error("CompanyHelm auth context is unavailable.");
  }

  return context;
}
