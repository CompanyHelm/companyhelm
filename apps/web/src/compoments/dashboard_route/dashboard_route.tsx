import { useSyncExternalStore } from "react";
import { Navigate, useNavigate } from "react-router";
import { authClient } from "../../auth/auth_client";
import { authSessionStore, type AuthSessionDocument } from "../../auth/auth_session_store";
import { DashboardPage } from "../../pages/dashboard/dashboard_page";

export function DashboardRoute() {
  const navigate = useNavigate();
  const session = useSyncExternalStore(
    authSessionStore.subscribe.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
  ) as AuthSessionDocument | null;

  if (!session) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <DashboardPage
      user={session.user}
      onSignOut={() => {
        authClient.signOut();
        navigate("/sign-in", { replace: true });
      }}
    />
  );
}
