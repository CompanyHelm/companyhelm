import { useSyncExternalStore } from "react";
import { Navigate } from "react-router";
import { authSessionStore, type AuthSessionDocument } from "../../auth/auth_session_store";

export function RootRedirect() {
  const session = useSyncExternalStore(
    authSessionStore.subscribe.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
  ) as AuthSessionDocument | null;

  return <Navigate to={session ? "/app" : "/sign-in"} replace />;
}
