import { createElement } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { authSessionStore } from "./auth/auth_session_store";
import { AuthenticationRoute } from "./compoments/authentication_route/authentication_route";
import { DashboardRoute } from "./compoments/dashboard_route/dashboard_route";
import { config } from "./config";

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
  beforeLoad: () => {
    throw redirect({
      to: config.authProvider === "clerk" || authSessionStore.getSession() ? "/app" : "/sign-in",
    });
  },
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  beforeLoad: () => {
    if (config.authProvider === "companyhelm" && authSessionStore.getSession()) {
      throw redirect({ to: "/app" });
    }
  },
  component: SignInRoute,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  beforeLoad: () => {
    if (config.authProvider === "companyhelm" && authSessionStore.getSession()) {
      throw redirect({ to: "/app" });
    }
  },
  component: SignUpRoute,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  beforeLoad: () => {
    if (config.authProvider === "companyhelm" && !authSessionStore.getSession()) {
      throw redirect({ to: "/sign-in" });
    }
  },
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
