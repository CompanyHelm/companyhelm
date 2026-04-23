import { Suspense } from "react";
import type { ReactNode } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { ErrorState } from "@/components/error_state";
import type { platformAdminGuardQuery } from "./__generated__/platformAdminGuardQuery.graphql";

const platformAdminGuardQueryNode = graphql`
  query platformAdminGuardQuery {
    Me {
      user {
        isPlatformAdmin
      }
    }
  }
`;

function PlatformAdminGuardContent(props: {
  children: ReactNode;
}) {
  const data = useLazyLoadQuery<platformAdminGuardQuery>(
    platformAdminGuardQueryNode,
    {},
    {
      fetchPolicy: "store-or-network",
    },
  );

  if (!data.Me.user.isPlatformAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState
          className="w-full max-w-2xl rounded-lg border border-border/70 bg-card/80 px-6 py-6 shadow-sm"
          message="This dashboard is reserved for CompanyHelm platform admins."
          title="Access denied"
        />
      </div>
    );
  }

  return <>{props.children}</>;
}

/**
 * Keeps platform-only routes closed to standard workspace users even when they navigate directly to
 * a known admin URL.
 */
export function PlatformAdminGuard(props: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <PlatformAdminGuardContent>{props.children}</PlatformAdminGuardContent>
    </Suspense>
  );
}
