import { useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/react";

export function AuthenticatedRoute() {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoaded && !auth.isSignedIn) {
      void navigate({ to: "/sign-in", replace: true });
    }
  }, [auth.isLoaded, auth.isSignedIn, navigate]);

  if (!auth.isLoaded || !auth.isSignedIn) {
    return null;
  }

  return <Outlet />;
}
