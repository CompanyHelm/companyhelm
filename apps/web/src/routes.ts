import { createElement } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AuthenticationRoute } from "./pages/auth/route";
import { DashboardRoute } from "./pages/dashboard/route";
import { PageContainerRoute } from "./pages/root/page_container_route";
import { RootRoute } from "./pages/root/route";

function SignInRoute() {
  return createElement(AuthenticationRoute, { mode: "signIn" });
}

function SignUpRoute() {
  return createElement(AuthenticationRoute, { mode: "signUp" });
}

const rootRoute = createRootRoute({
  component: Outlet,
});

const pageContainerRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "page-container",
  component: PageContainerRoute,
});

const rootIndexRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/",
  component: RootRoute,
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

const appRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/app",
  component: DashboardRoute,
});

const routeTree = rootRoute.addChildren([
  pageContainerRoute.addChildren([
    rootIndexRoute,
    appRoute,
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
