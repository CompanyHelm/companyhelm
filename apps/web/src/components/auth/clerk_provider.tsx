import type { ReactNode } from "react";
import {
  ClerkProvider,
  OrganizationList,
  OrganizationSwitcher,
  SignIn,
  SignUp,
  UserButton,
  useAuth,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/react";
import { CompanyHelmAuthContext } from "@/auth/companyhelm_auth";
import { config } from "@/config";

const clerkAppearance = {
  options: {
    privacyPageUrl: config.privacyPolicyUrl || undefined,
    termsPageUrl: config.termsOfServiceUrl || undefined,
  },
} as const;

function ClerkAuthContextBridge(props: {
  children: ReactNode;
}) {
  const auth = useAuth();
  const organization = useOrganization();
  const organizationList = useOrganizationList({
    userMemberships: {
      keepPreviousData: true,
      pageSize: 100,
    },
  });
  const user = useUser();

  return (
    <CompanyHelmAuthContext.Provider
      value={{
        auth: {
          getToken: auth.getToken,
          isLoaded: auth.isLoaded,
          isSignedIn: auth.isSignedIn === true,
          userId: auth.userId || null,
        },
        devAuth: null,
        localAuth: null,
        organization: {
          isLoaded: organization.isLoaded,
          organization: organization.organization
            ? {
              id: organization.organization.id,
              name: organization.organization.name,
              slug: organization.organization.slug ?? organization.organization.id,
            }
            : null,
        },
        organizationList: {
          isLoaded: organizationList.isLoaded,
          setActive: organizationList.setActive,
          userMemberships: {
            data: organizationList.userMemberships.data?.map((membership) => ({
              organization: {
                id: membership.organization.id,
                name: membership.organization.name,
                slug: membership.organization.slug ?? membership.organization.id,
              },
            })) ?? [],
          },
        },
        provider: "clerk",
        user: {
          isLoaded: user.isLoaded,
          user: user.user
            ? {
              firstName: user.user.firstName ?? "User",
              id: user.user.id,
              isPlatformAdmin: undefined,
              lastName: user.user.lastName,
              primaryEmailAddress: {
                emailAddress: user.user.primaryEmailAddress?.emailAddress ?? "",
              },
            }
            : null,
        },
      }}
    >
      {props.children}
    </CompanyHelmAuthContext.Provider>
  );
}

/**
 * Wraps the app in Clerk and bridges Clerk's session primitives onto the shared CompanyHelm auth
 * context consumed by the rest of the web app.
 */
export function CompanyHelmClerkProvider(props: {
  children: ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance} publishableKey={config.clerkPublishableKey}>
      <ClerkAuthContextBridge>
        {props.children}
      </ClerkAuthContextBridge>
    </ClerkProvider>
  );
}

export {
  OrganizationList as ClerkOrganizationList,
  OrganizationSwitcher as ClerkOrganizationSwitcher,
  SignIn as ClerkSignIn,
  SignUp as ClerkSignUp,
  UserButton as ClerkUserButton,
};
