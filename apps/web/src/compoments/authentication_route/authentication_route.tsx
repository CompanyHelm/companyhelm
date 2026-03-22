import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { ClerkPage } from "../../auth/clerk/page";
import type { ClerkPageMode } from "../../auth/clerk/page";

interface AuthenticationRouteProps {
  mode: ClerkPageMode;
}

export function AuthenticationRoute(props: AuthenticationRouteProps) {
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

  return <ClerkPage mode={props.mode} />;
}
