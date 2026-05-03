import type { ReactNode } from "react";
import {
  Suspense,
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { fetchQuery, graphql, useLazyLoadQuery, useRelayEnvironment } from "react-relay";
import type { CompanyHelmOrganization } from "@/auth/companyhelm_auth";
import { useAuth, useOrganization } from "@/components/auth/auth_provider";
import type { meContextQuery } from "./__generated__/meContextQuery.graphql";

export const meContextQueryNode = graphql`
  query meContextQuery {
    Me {
      user {
        id
        email
        firstName
        lastName
      }
      company {
        id
        name
        onboarding {
          id
          companyId
          status
          companyMission
          missionSkippedAt
          githubSetupStatus
          githubCompletedAt
          githubSkippedAt
          llmSetupStatus
          llmCompletedAt
          llmSkippedAt
          agentId
          sessionId
          workflowRunId
          updatedAt
        }
      }
      companyMembership {
        role
        status
      }
      companyEntitlements {
        canDeleteCompany
        canInviteMembers
        canManageMemberRoles
      }
      serverVersion
    }
  }
`;

type MeDocument = meContextQuery["response"]["Me"];

interface MeContextValue {
  company: MeDocument["company"];
  companyEntitlements: MeDocument["companyEntitlements"];
  companyMembership: MeDocument["companyMembership"];
  companySlug: string | null;
  organization: CompanyHelmOrganization | null;
  refreshMe(): Promise<void>;
  serverVersion: MeDocument["serverVersion"];
  user: MeDocument["user"];
}

export type MeCompany = MeContextValue["company"];
export type MeCompanyOnboarding = MeCompany["onboarding"];

const MeContext = createContext<MeContextValue | null>(null);

/**
 * Loads the backend Me document once for the active authenticated company and exposes the resulting
 * authorization state to the route tree without repeating small `Me` queries in each shell piece.
 */
export function MeProvider(props: {
  children: ReactNode;
}) {
  const auth = useAuth();
  const organizationState = useOrganization();

  if (!auth.isLoaded) {
    return null;
  }

  if (!auth.isSignedIn || !auth.userId) {
    return createElement(MeContext.Provider, { value: null }, props.children);
  }

  if (!organizationState.isLoaded) {
    return null;
  }

  const meKey = `${auth.userId}:${organizationState.organization?.id ?? "no-organization"}`;

  return createElement(
    Suspense,
    {
      fallback: null,
    },
    createElement(
      MeProviderContent,
      {
        key: meKey,
        organization: organizationState.organization,
      },
      props.children,
    ),
  );
}

function MeProviderContent(props: {
  children?: ReactNode;
  organization: CompanyHelmOrganization | null;
}) {
  const relayEnvironment = useRelayEnvironment();
  const data = useLazyLoadQuery<meContextQuery>(
    meContextQueryNode,
    {},
    {
      fetchPolicy: "network-only",
    },
  );
  const refreshMe = useCallback(async () => {
    await fetchQuery<meContextQuery>(
      relayEnvironment,
      meContextQueryNode,
      {},
      {
        fetchPolicy: "network-only",
      },
    ).toPromise();
  }, [relayEnvironment]);
  const value = useMemo<MeContextValue>(() => ({
    company: data.Me.company,
    companyEntitlements: data.Me.companyEntitlements,
    companyMembership: data.Me.companyMembership,
    companySlug: props.organization?.slug ?? null,
    organization: props.organization,
    refreshMe,
    serverVersion: data.Me.serverVersion,
    user: data.Me.user,
  }), [
    data.Me.company,
    data.Me.companyEntitlements,
    data.Me.companyMembership,
    data.Me.serverVersion,
    data.Me.user,
    props.organization,
    refreshMe,
  ]);

  return createElement(MeContext.Provider, { value }, props.children);
}

export function useOptionalMe(): MeContextValue | null {
  return useContext(MeContext);
}

export function useMe(): MeContextValue {
  const context = useOptionalMe();
  if (!context) {
    throw new Error("Me context is unavailable.");
  }

  return context;
}

export function useMeUser(): MeContextValue["user"] {
  return useMe().user;
}

export function useMeCompany(): MeContextValue["company"] {
  return useMe().company;
}

export function useRefreshMe(): MeContextValue["refreshMe"] {
  return useMe().refreshMe;
}
