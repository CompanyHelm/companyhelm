import { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
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

  useEffect(() => {
    if (!session) {
      void navigate({ to: "/sign-in", replace: true });
    }
  }, [navigate, session]);

  if (!session) {
    return null;
  }

  return (
    <DashboardPage
      user={session.user}
      onSignOut={() => {
        authClient.signOut();
        void navigate({ to: "/sign-in", replace: true });
      }}
    />
  );
}
