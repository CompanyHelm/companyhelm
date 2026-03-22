import { createElement } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AuthenticationRoute } from "./pages/auth/route";
import { DashboardRoute } from "./pages/dashboard/route";
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

const rootIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => rootRoute,
  path: "/app",
  component: DashboardRoute,
});

const routeTree = rootRoute.addChildren([
  rootIndexRoute,
  signInRoute,
  signUpRoute,
  appRoute,
]);

export const applicationRouter = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof applicationRouter;
  }
}
