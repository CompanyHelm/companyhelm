import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";

export function RootRoute() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoaded) {
      return;
    }

    void navigate({
      to: auth.isSignedIn ? "/app" : "/sign-in",
      replace: true,
    });
  }, [auth.isLoaded, auth.isSignedIn, navigate]);

  return null;
}
