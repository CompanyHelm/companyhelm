import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, useOrganization } from "@/components/auth/auth_provider";
import { config } from "@/config";
import { CreateCompanyPage } from "./create_company_page";

export function CreateCompanyRoute() {
  const auth = useAuth();
  const navigate = useNavigate();
  const organization = useOrganization();

  useEffect(() => {
    if (config.authProvider !== "dev") {
      void navigate({ to: "/", replace: true });
      return;
    }

    if (auth.isLoaded && auth.isSignedIn && organization.isLoaded && organization.organization?.slug) {
      void navigate({ to: "/", replace: true });
    }
  }, [auth.isLoaded, auth.isSignedIn, navigate, organization.isLoaded, organization.organization?.slug]);

  if (config.authProvider !== "dev") {
    return null;
  }

  if (auth.isLoaded && auth.isSignedIn && organization.isLoaded && organization.organization?.slug) {
    return null;
  }

  return <CreateCompanyPage />;
}
