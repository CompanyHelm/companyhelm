export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "warning";
  summary: string;
  detail: string;
}

export interface VisitorsBar {
  label: string;
  value: number;
}

export interface DocumentRow {
  header: string;
  sectionType: string;
  status: "Done" | "In Process";
  target: number;
  limit: number;
  reviewer: string;
}

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "Total Revenue",
    value: "$1,250.00",
    change: "+12.5%",
    tone: "positive",
    summary: "Trending up this month",
    detail: "Signed deployments are pacing above the operating baseline.",
  },
  {
    label: "New Customers",
    value: "1,234",
    change: "-20%",
    tone: "warning",
    summary: "Down 20% this period",
    detail: "Acquisition handoff needs attention before the next launch cycle.",
  },
  {
    label: "Active Accounts",
    value: "45,678",
    change: "+12.5%",
    tone: "positive",
    summary: "Strong user retention",
    detail: "Workspace engagement is staying above internal targets.",
  },
  {
    label: "Growth Rate",
    value: "4.5%",
    change: "+4.5%",
    tone: "positive",
    summary: "Steady performance increase",
    detail: "Projected expansion remains aligned with roadmap expectations.",
  },
];

export const visitorsBars: VisitorsBar[] = [
  { label: "Oct", value: 34 },
  { label: "Nov", value: 54 },
  { label: "Dec", value: 48 },
  { label: "Jan", value: 68 },
  { label: "Feb", value: 72 },
  { label: "Mar", value: 91 },
];

export const documentRows: DocumentRow[] = [
  {
    header: "Workspace overview",
    sectionType: "Cover page",
    status: "In Process",
    target: 18,
    limit: 5,
    reviewer: "Eddie Lake",
  },
  {
    header: "Control plane summary",
    sectionType: "Narrative",
    status: "Done",
    target: 29,
    limit: 24,
    reviewer: "Eddie Lake",
  },
  {
    header: "Agent operating model",
    sectionType: "Narrative",
    status: "Done",
    target: 10,
    limit: 13,
    reviewer: "Eddie Lake",
  },
  {
    header: "Execution pipeline",
    sectionType: "Technical content",
    status: "Done",
    target: 27,
    limit: 23,
    reviewer: "Jamik Tashpulatov",
  },
  {
    header: "Team orchestration",
    sectionType: "Narrative",
    status: "In Process",
    target: 20,
    limit: 8,
    reviewer: "Jamik Tashpulatov",
  },
  {
    header: "Policy coverage",
    sectionType: "Narrative",
    status: "In Process",
    target: 19,
    limit: 21,
    reviewer: "Reviewer",
  },
];
