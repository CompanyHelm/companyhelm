import { Tabs } from "@base-ui/react/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documentRows } from "./dashboard_data";

const DOCUMENT_VIEWS = [
  { label: "Outline", value: "outline" },
  { label: "Past Performance", value: "past-performance" },
  { label: "Key Personnel", value: "key-personnel" },
  { label: "Focus Documents", value: "focus-documents" },
] as const;

function DocumentsTablePanel() {
  return (
    <div className="dashboard-table__content">
      <div className="dashboard-table__scroller">
        <table>
          <thead>
            <tr>
              <th>Header</th>
              <th>Section Type</th>
              <th>Status</th>
              <th>Target</th>
              <th>Limit</th>
              <th>Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {documentRows.map((row) => (
              <tr key={row.header}>
                <td>{row.header}</td>
                <td>{row.sectionType}</td>
                <td>
                  <Badge variant={row.status === "Done" ? "positive" : "warning"}>
                    {row.status}
                  </Badge>
                </td>
                <td>{row.target}</td>
                <td>{row.limit}</td>
                <td>{row.reviewer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dashboard-table__footer">
        <span>0 of 68 row(s) selected.</span>
        <span>Page 1 of 7</span>
      </div>
    </div>
  );
}

export function DocumentsTable() {
  return (
    <Tabs.Root className="dashboard-table" defaultValue="outline">
      <Card>
        <CardHeader className="dashboard-table__header">
          <div className="dashboard-table__heading">
            <CardTitle>View</CardTitle>
            <Tabs.List className="dashboard-table__tabs" aria-label="Document views">
              {DOCUMENT_VIEWS.map((view) => (
                <Tabs.Tab key={view.value} className="dashboard-table__tab" value={view.value}>
                  {view.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </div>

          <div className="dashboard-table__actions">
            <Button variant="outline">Customize Columns</Button>
            <Button variant="outline">Add Section</Button>
          </div>
        </CardHeader>

        <CardContent>
          {DOCUMENT_VIEWS.map((view) => (
            <Tabs.Panel key={view.value} value={view.value}>
              <DocumentsTablePanel />
            </Tabs.Panel>
          ))}
        </CardContent>
      </Card>
    </Tabs.Root>
  );
}
