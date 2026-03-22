import { useEffect, useSyncExternalStore } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "../../auth/auth_client";
import { authSessionStore, type AuthSessionDocument } from "../../auth/auth_session_store";
import { DashboardPage } from "../../pages/dashboard/dashboard_page";
import { config } from "../../config";

export function DashboardRoute() {
  if (config.authProvider === "clerk") {
    return <ClerkDashboardRoute />;
  }

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

function ClerkDashboardRoute() {
  const navigate = useNavigate();
  const auth = useAuth();
  const userState = useUser();

  useEffect(() => {
    if (auth.isLoaded && !auth.isSignedIn) {
      void navigate({ to: "/sign-in", replace: true });
    }
  }, [auth.isLoaded, auth.isSignedIn, navigate]);

  if (!auth.isLoaded || !auth.isSignedIn || !userState.user) {
    return null;
  }

  return (
    <DashboardPage
      user={{
        id: userState.user.id,
        email: userState.user.primaryEmailAddress?.emailAddress || "",
        firstName: userState.user.firstName || "",
        lastName: userState.user.lastName || null,
      }}
    />
  );
}
