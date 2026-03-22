import { useEffect, useState, useSyncExternalStore } from "react";
import { authClient } from "./auth/auth_client";
import { authSessionStore, type AuthSessionDocument } from "./auth/auth_session_store";
import { AuthPage, type AuthPageMode } from "./pages/auth_page";
import { DashboardPage } from "./pages/dashboard_page";

type AppRouteDocument = "/" | "/app" | "/sign-in" | "/sign-up";

function normalizeRoute(pathName: string): AppRouteDocument {
  const normalizedPath = String(pathName || "").trim() || "/";
  if (normalizedPath === "/app" || normalizedPath === "/sign-in" || normalizedPath === "/sign-up") {
    return normalizedPath;
  }
  return "/";
}

function replaceRoute(pathName: AppRouteDocument): void {
  window.history.replaceState({}, "", pathName);
}

function pushRoute(pathName: AppRouteDocument): void {
  window.history.pushState({}, "", pathName);
}

export default function App() {
  const session = useSyncExternalStore(
    authSessionStore.subscribe.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
    authSessionStore.getSession.bind(authSessionStore),
  ) as AuthSessionDocument | null;
  const [route, setRoute] = useState<AppRouteDocument>(() => normalizeRoute(window.location.pathname));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handlePopState() {
      setRoute(normalizeRoute(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (session && route !== "/app") {
      replaceRoute("/app");
      setRoute("/app");
      return;
    }

    if (!session && route !== "/sign-in" && route !== "/sign-up") {
      replaceRoute("/sign-in");
      setRoute("/sign-in");
    }
  }, [route, session]);

  async function handleSubmit(mode: AuthPageMode, input: Record<string, string>) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (mode === "signIn") {
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

      replaceRoute("/app");
      setRoute("/app");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session) {
    return (
      <DashboardPage
        user={session.user}
        onSignOut={() => {
          authClient.signOut();
          replaceRoute("/sign-in");
          setRoute("/sign-in");
        }}
      />
    );
  }

  const mode: AuthPageMode = route === "/sign-up" ? "signUp" : "signIn";

  return (
    <AuthPage
      mode={mode}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onSubmit={(input) => handleSubmit(mode, input as Record<string, string>)}
      onNavigateToSignIn={() => {
        setErrorMessage("");
        pushRoute("/sign-in");
        setRoute("/sign-in");
      }}
      onNavigateToSignUp={() => {
        setErrorMessage("");
        pushRoute("/sign-up");
        setRoute("/sign-up");
      }}
    />
  );
}
