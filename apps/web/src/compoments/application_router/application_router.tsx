import { RouterProvider } from "@tanstack/react-router";
import { applicationRouter } from "../../routes";

export function ApplicationRouter() {
  return <RouterProvider router={applicationRouter} />;
}
