import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth_provider";
import { useNavigate } from "@tanstack/react-router";
import { AuthenticationPage } from "./page";
import type { AuthenticationPageMode } from "./page";

interface AuthenticationRouteProps {
  mode: AuthenticationPageMode;
}

export function AuthenticationRoute(props: AuthenticationRouteProps) {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoaded && auth.isSignedIn) {
      void navigate({ to: "/", replace: true });
    }
  }, [auth.isLoaded, auth.isSignedIn, navigate]);

  if (!auth.isLoaded || auth.isSignedIn) {
    return null;
  }

  return <AuthenticationPage mode={props.mode} />;
}
