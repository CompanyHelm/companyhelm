import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardMetrics } from "./dashboard_data";

export function OverviewCards() {
  return (
    <section className="dashboard-overview" aria-label="Overview">
      {dashboardMetrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader>
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle className="dashboard-overview__value">{metric.value}</CardTitle>
          </CardHeader>
          <CardContent className="dashboard-overview__content">
            <Badge variant={metric.tone === "positive" ? "positive" : "warning"}>
              {metric.change}
            </Badge>
            <div className="dashboard-overview__summary">
              <p>{metric.summary}</p>
              <span>{metric.detail}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
