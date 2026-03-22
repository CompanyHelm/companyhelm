import { createElement } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { AuthenticationRoute } from "./compoments/authentication_route/authentication_route";
import { DashboardRoute } from "./compoments/dashboard_route/dashboard_route";
import { RootRedirect } from "./compoments/root_redirect/root_redirect";

function SignInRoute() {
  return createElement(AuthenticationRoute, { mode: "signIn" });
}

function SignUpRoute() {
  return createElement(AuthenticationRoute, { mode: "signUp" });
}

const routes: RouteObject[] = [
  {
    path: "/",
    Component: RootRedirect,
  },
  {
    path: "/sign-in",
    Component: SignInRoute,
  },
  {
    path: "/sign-up",
    Component: SignUpRoute,
  },
  {
    path: "/app",
    Component: DashboardRoute,
  },
];

export const applicationRouter = createBrowserRouter(routes);
