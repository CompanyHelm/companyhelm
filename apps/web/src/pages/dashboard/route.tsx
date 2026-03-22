import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { DashboardPage } from "./dashboard_page";

export function DashboardRoute() {
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
