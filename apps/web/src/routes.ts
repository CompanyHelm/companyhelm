import { createElement } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AuthenticationRoute } from "./pages/auth/route";
import { DashboardPage } from "./pages/dashboard/dashboard_page";
import { ModelProviderCredentialDetailPage } from "./pages/model-provider-credentials/credential_detail_page";
import { ModelProviderCredentialsPage } from "./pages/model-provider-credentials/model_provider_credentials_page";
import { AuthenticatedRoute } from "./pages/root/authenticated_route";
import { PageContainerRoute } from "./pages/root/page_container_route";

function SignInRoute() {
  return createElement(AuthenticationRoute, { mode: "signIn" });
}

function SignUpRoute() {
  return createElement(AuthenticationRoute, { mode: "signUp" });
}

const rootRoute = createRootRoute({
  component: Outlet,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: AuthenticatedRoute,
});

const pageContainerRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  id: "page-container",
  component: PageContainerRoute,
});

const rootIndexRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/",
  component: DashboardPage,
});

const modelProviderCredentialsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/model-provider-credentials",
  component: ModelProviderCredentialsPage,
});

const modelProviderCredentialDetailRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  id: "model-provider-credential-detail",
  path: "/model-provider-credentials/$credentialId",
  component: ModelProviderCredentialDetailPage,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInRoute,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  component: SignUpRoute,
});

const routeTree = rootRoute.addChildren([
  authenticatedRoute.addChildren([
    pageContainerRoute.addChildren([
      rootIndexRoute,
      modelProviderCredentialsRoute,
      modelProviderCredentialDetailRoute,
    ]),
  ]),
  signInRoute,
  signUpRoute,
]);

export const applicationRouter = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof applicationRouter;
  }
}
