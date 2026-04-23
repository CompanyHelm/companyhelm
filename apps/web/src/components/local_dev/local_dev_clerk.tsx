import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { OrganizationPath } from "@/lib/organization_path";

type LocalDevOrganizationRecord = {
  id: string;
  name: string;
  slug: string;
};

type LocalDevUserRecord = {
  firstName: string;
  id: string;
  lastName: string | null;
  primaryEmailAddress: {
    emailAddress: string;
  };
};

type LocalDevOrganizationMembershipRecord = {
  organization: LocalDevOrganizationRecord;
};

type LocalDevOrganizationListState = {
  isLoaded: boolean;
  setActive: (input: { organization: string }) => Promise<void>;
  userMemberships: {
    data: LocalDevOrganizationMembershipRecord[];
  };
};

type LocalDevAuthState = {
  getToken: () => Promise<string>;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string;
};

type LocalDevUserState = {
  isLoaded: boolean;
  user: LocalDevUserRecord;
};

type LocalDevOrganizationState = {
  isLoaded: boolean;
  organization: LocalDevOrganizationRecord;
};

const LOCAL_DEV_AUTH_TOKEN = "companyhelm-local-dev-auth-token";
const LOCAL_DEV_ORGANIZATION: LocalDevOrganizationRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "CompanyHelm Local Dev",
  slug: "local-dev",
};
const LOCAL_DEV_USER: LocalDevUserRecord = {
  firstName: "Local",
  id: "00000000-0000-4000-8000-000000000002",
  lastName: "Developer",
  primaryEmailAddress: {
    emailAddress: "local-dev@companyhelm.local",
  },
};

/**
 * Replaces Clerk during local preview sessions so the real CompanyHelm app can boot without any
 * external identity dependency while still exercising the production routes and page shell.
 */
export function ClerkProvider(props: {
  appearance?: unknown;
  children: ReactNode;
  publishableKey: string;
}) {
  void props.appearance;
  void props.publishableKey;
  return props.children;
}

/**
 * Mirrors Clerk's auth hook with a fixed signed-in local developer identity for local preview
 * routes.
 */
export function useAuth(): LocalDevAuthState {
  return {
    getToken: async () => LOCAL_DEV_AUTH_TOKEN,
    isLoaded: true,
    isSignedIn: true,
    userId: LOCAL_DEV_USER.id,
  };
}

/**
 * Exposes the local preview user record in the same shape the app already expects from Clerk.
 */
export function useUser(): LocalDevUserState {
  return {
    isLoaded: true,
    user: LOCAL_DEV_USER,
  };
}

/**
 * Exposes the active preview organization so org-scoped routes can resolve immediately.
 */
export function useOrganization(): LocalDevOrganizationState {
  return {
    isLoaded: true,
    organization: LOCAL_DEV_ORGANIZATION,
  };
}

/**
 * Supplies one local membership and a no-op activation callback, which is enough for the sidebar
 * and org route guard to behave like a signed-in single-company workspace.
 */
export function useOrganizationList(options?: unknown): LocalDevOrganizationListState {
  void options;
  return {
    isLoaded: true,
    setActive: async () => undefined,
    userMemberships: {
      data: [{ organization: LOCAL_DEV_ORGANIZATION }],
    },
  };
}

/**
 * Shows a lightweight local-dev company badge where the real app would normally mount Clerk's org
 * switcher.
 */
export function OrganizationSwitcher(props: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
}) {
  void props.afterCreateOrganizationUrl;
  void props.afterSelectOrganizationUrl;
  return (
    <div className="rounded-md border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-foreground">
      <p className="font-medium">{LOCAL_DEV_ORGANIZATION.name}</p>
      <p className="text-xs text-sidebar-foreground/70">Local dev auth bypass</p>
    </div>
  );
}

/**
 * Renders a direct link to the one preview organization so org error states still offer a useful
 * recovery action during local development.
 */
export function OrganizationList(props: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
  hidePersonal?: boolean;
}) {
  void props.afterCreateOrganizationUrl;
  void props.afterSelectOrganizationUrl;
  void props.hidePersonal;
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <p className="text-sm font-medium text-foreground">Available local organization</p>
      <Link
        className="mt-3 inline-flex rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        params={{ organizationSlug: LOCAL_DEV_ORGANIZATION.slug }}
        to={OrganizationPath.route("/")}
      >
        Open {LOCAL_DEV_ORGANIZATION.slug}
      </Link>
    </div>
  );
}

/**
 * Keeps auth routes readable when the local bypass is enabled instead of sending developers to a
 * dead-end hosted Clerk screen.
 */
export function SignIn(props: {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signUpUrl?: string;
}) {
  void props.appearance;
  void props.forceRedirectUrl;
  void props.signUpUrl;
  return (
    <LocalDevAuthCard
      description="Local development auth bypass is enabled, so CompanyHelm signs you in automatically."
      title="Sign in skipped"
    />
  );
}

/**
 * Mirrors the sign-in bypass message for the sign-up route.
 */
export function SignUp(props: {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signInUrl?: string;
}) {
  void props.appearance;
  void props.forceRedirectUrl;
  void props.signInUrl;
  return (
    <LocalDevAuthCard
      description="Local development auth bypass is enabled, so there is no separate sign-up flow to complete."
      title="Sign up skipped"
    />
  );
}

/**
 * Replaces Clerk's profile button with a small local-dev identity pill in the sidebar footer.
 */
export function UserButton() {
  return (
    <div className="flex size-8 items-center justify-center rounded-full border border-sidebar-border/70 bg-sidebar-accent/40 text-xs font-semibold text-sidebar-foreground">
      LD
    </div>
  );
}

function LocalDevAuthCard(props: {
  description: string;
  title: string;
}) {
  return (
    <div className="w-full rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
      <p className="text-base font-semibold text-foreground">{props.title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{props.description}</p>
      <Link
        className="mt-4 inline-flex rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        params={{ organizationSlug: LOCAL_DEV_ORGANIZATION.slug }}
        to={OrganizationPath.route("/chats")}
      >
        Open chats workspace
      </Link>
    </div>
  );
}
