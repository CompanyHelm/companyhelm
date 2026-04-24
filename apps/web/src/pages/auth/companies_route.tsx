import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth, useOrganization, useUser } from "@/components/auth/auth_provider";
import { config } from "@/config";
import { CompaniesPage } from "./companies_page";

type CompaniesRouteSearch = {
  userId?: string;
};

export function CompaniesRoute() {
  const auth = useAuth();
  const navigate = useNavigate();
  const organization = useOrganization();
  const search = useSearch({ strict: false }) as CompaniesRouteSearch;
  const user = useUser();
  const selectedUserId = search.userId || user.user?.id || "";

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
    user.user?.id,
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

  return <CompaniesPage userId={selectedUserId} />;
}
