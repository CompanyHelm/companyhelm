import { useState, useSyncExternalStore } from "react";
import { Navigate, useNavigate } from "react-router";
import { authClient } from "../../auth/auth_client";
import { authSessionStore, type AuthSessionDocument } from "../../auth/auth_session_store";
import { AuthPage, type AuthPageMode } from "../../pages/auth/auth_page";

interface AuthenticationRouteProps {
  mode: AuthPageMode;
}

export function AuthenticationRoute(props: AuthenticationRouteProps) {
  const navigate = useNavigate();
  const session = useSyncExternalStore(
    authSessionStore.subscribe.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
  ) as AuthSessionDocument | null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (session) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(input: Record<string, string>) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (props.mode === "signIn") {
        await authClient.signIn({
          email: String(input.email || "").trim(),
          password: String(input.password || ""),
        });
      } else {
        await authClient.signUp({
          firstName: String(input.firstName || "").trim(),
          lastName: String(input.lastName || "").trim(),
          email: String(input.email || "").trim(),
          password: String(input.password || ""),
        });
      }

      navigate("/app", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPage
      mode={props.mode}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
      onNavigateToSignIn={() => {
        setErrorMessage("");
        navigate("/sign-in");
      }}
      onNavigateToSignUp={() => {
        setErrorMessage("");
        navigate("/sign-up");
      }}
    />
  );
}
