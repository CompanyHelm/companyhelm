import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { visitorsBars } from "./dashboard_data";

export function VisitorsPanel() {
  const peakValue = Math.max(...visitorsBars.map((bar) => bar.value));

  return (
    <Card className="dashboard-visitors">
      <CardHeader className="dashboard-visitors__header">
        <div>
          <CardTitle>Total Visitors</CardTitle>
          <CardDescription>Total for the last 3 months</CardDescription>
        </div>

        <div className="dashboard-visitors__filters">
          <Button variant="secondary">Last 3 months</Button>
          <Button variant="ghost">Last 30 days</Button>
          <Button variant="ghost">Last 7 days</Button>
        </div>
      </CardHeader>

      <CardContent className="dashboard-visitors__content">
        <div className="dashboard-visitors__chart" aria-hidden="true">
          {visitorsBars.map((bar) => (
            <div key={bar.label} className="dashboard-visitors__bar-group">
              <div
                className="dashboard-visitors__bar"
                style={{ height: `${Math.round((bar.value / peakValue) * 100)}%` }}
              />
              <span>{bar.label}</span>
            </div>
          ))}
        </div>

        <div className="dashboard-visitors__footnote">
          <strong>32,450</strong>
          <span>Last 90 days across agent workspaces, policy views, and deployment handoffs.</span>
        </div>
      </CardContent>
    </Card>
  );
}
