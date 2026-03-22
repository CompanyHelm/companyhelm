import { RouterProvider } from "react-router";
import { applicationRouter } from "../../routes";

export function ApplicationRouter() {
  return <RouterProvider router={applicationRouter} />;
}
