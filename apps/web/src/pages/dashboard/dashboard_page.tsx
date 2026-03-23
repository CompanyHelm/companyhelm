import { useUser } from "@clerk/react";
import { DocumentsTable } from "./documents_table";
import { OverviewCards } from "./overview_cards";
import { VisitorsPanel } from "./visitors_panel";

export function DashboardPage() {
  const userState = useUser();

  if (!userState.user) {
    return null;
  }

  return (
    <main className="dashboard-page">
      <OverviewCards />
      <VisitorsPanel />
      <DocumentsTable />
    </main>
  );
}
