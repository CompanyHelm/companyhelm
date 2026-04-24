import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, useOrganization } from "@/components/auth/auth_provider";
import { DevAuthSelectionStorage } from "@/auth/dev_auth_selection_storage";
import { config } from "@/config";
import { CompaniesPage } from "./companies_page";

export function CompaniesRoute() {
  const auth = useAuth();
  const navigate = useNavigate();
  const organization = useOrganization();
  const selectedUserId = new DevAuthSelectionStorage().read().userId || "";

  useEffect(() => {
    if (config.authProvider !== "dev") {
      void navigate({ to: "/", replace: true });
      return;
    }

    if (auth.isLoaded && auth.isSignedIn && organization.isLoaded && organization.organization?.slug) {
      void navigate({ to: "/", replace: true });
      return;
    }

    if (auth.isLoaded && !selectedUserId) {
      void navigate({ to: "/sign-up", replace: true });
    }
  }, [
    auth.isLoaded,
    auth.isSignedIn,
    navigate,
    organization.isLoaded,
    organization.organization?.slug,
    selectedUserId,
  ]);

  if (config.authProvider !== "dev") {
    return null;
  }

  if (!auth.isLoaded || !organization.isLoaded) {
    return null;
  }

  if (auth.isSignedIn && organization.organization?.slug) {
    return null;
  }

  if (!selectedUserId) {
    return null;
  }

  return <CompaniesPage />;
}
