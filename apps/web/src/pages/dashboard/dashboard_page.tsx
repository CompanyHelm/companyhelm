import { DocumentsTable } from "./documents_table";
import { OverviewCards } from "./overview_cards";
import { VisitorsPanel } from "./visitors_panel";

interface DashboardPageProps {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
}

export function DashboardPage(props: DashboardPageProps) {
  return (
    <main className="dashboard-page">
      <OverviewCards />
      <VisitorsPanel />
      <DocumentsTable />
    </main>
  );
}
