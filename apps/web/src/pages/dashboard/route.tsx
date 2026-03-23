import { useUser } from "@clerk/react";
import { DashboardPage } from "./dashboard_page";

export function DashboardRoute() {
  const userState = useUser();

  if (!userState.user) {
    return null;
  }

  return (
    <DashboardPage
      user={{
        id: userState.user.id,
        email: userState.user.primaryEmailAddress?.emailAddress || "",
        firstName: userState.user.firstName || "",
        lastName: userState.user.lastName || null,
      }}
    />
  );
}
