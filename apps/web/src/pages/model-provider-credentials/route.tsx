import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { ModelProviderCredentialsPage } from "./model_provider_credentials_page";

export function ModelProviderCredentialsRoute() {
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

  return <ModelProviderCredentialsPage />;
}
