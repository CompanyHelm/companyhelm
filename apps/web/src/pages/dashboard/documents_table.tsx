import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documentRows } from "./dashboard_data";

export function DocumentsTable() {
  return (
    <Card className="dashboard-table">
      <CardHeader className="dashboard-table__header">
        <div className="dashboard-table__heading">
          <CardTitle>View</CardTitle>
          <div className="dashboard-table__tabs" role="tablist" aria-label="Document views">
            <button aria-selected="true" className="dashboard-table__tab" role="tab" type="button">
              Outline
            </button>
            <button className="dashboard-table__tab" role="tab" type="button">
              Past Performance
            </button>
            <button className="dashboard-table__tab" role="tab" type="button">
              Key Personnel
            </button>
            <button className="dashboard-table__tab" role="tab" type="button">
              Focus Documents
            </button>
          </div>
        </div>

        <div className="dashboard-table__actions">
          <Button variant="outline">Customize Columns</Button>
          <Button variant="outline">Add Section</Button>
        </div>
      </CardHeader>

      <CardContent className="dashboard-table__content">
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
      </CardContent>
    </Card>
  );
}
