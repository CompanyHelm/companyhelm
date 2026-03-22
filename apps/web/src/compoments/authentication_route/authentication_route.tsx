import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "../../auth/auth_client";
import type { SignInInputDocument, SignUpInputDocument } from "../../auth/auth_client";
import { authSessionStore, type AuthSessionDocument } from "../../auth/auth_session_store";
import { AuthPage, type AuthPageMode } from "../../pages/auth/auth_page";
import { ClerkAuthPage } from "../../pages/auth/clerk_auth_page";
import { config } from "../../config";

interface AuthenticationRouteProps {
  mode: AuthPageMode;
}

export function AuthenticationRoute(props: AuthenticationRouteProps) {
  if (config.authProvider === "clerk") {
    return <ClerkAuthenticationRoute mode={props.mode} />;
  }

  const navigate = useNavigate();
  const session = useSyncExternalStore(
    authSessionStore.subscribe.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
  ) as AuthSessionDocument | null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (session) {
      void navigate({ to: "/app", replace: true });
    }
  }, [navigate, session]);

  async function handleSubmit(input: SignInInputDocument | SignUpInputDocument) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (props.mode === "signIn") {
        await authClient.signIn({
          email: String(input.email || "").trim(),
          password: String(input.password || ""),
        });
      } else {
        const signUpInput = input as SignUpInputDocument;
        await authClient.signUp({
          firstName: String(signUpInput.firstName || "").trim(),
          lastName: String(signUpInput.lastName || "").trim(),
          email: String(signUpInput.email || "").trim(),
          password: String(signUpInput.password || ""),
        });
      }

      await navigate({ to: "/app", replace: true });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session) {
    return null;
  }

  return (
    <AuthPage
      mode={props.mode}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
      onNavigateToSignIn={() => {
        setErrorMessage("");
        void navigate({ to: "/sign-in" });
      }}
      onNavigateToSignUp={() => {
        setErrorMessage("");
        void navigate({ to: "/sign-up" });
      }}
    />
  );
}

function ClerkAuthenticationRoute(props: AuthenticationRouteProps) {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoaded && auth.isSignedIn) {
      void navigate({ to: "/app", replace: true });
    }
  }, [auth.isLoaded, auth.isSignedIn, navigate]);

  if (!auth.isLoaded || auth.isSignedIn) {
    return null;
  }

  return <ClerkAuthPage mode={props.mode} />;
}
