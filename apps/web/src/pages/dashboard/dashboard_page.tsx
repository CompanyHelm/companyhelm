interface DashboardPageProps {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
}

export function DashboardPage(props: DashboardPageProps) {
  const displayName = String(props.user?.firstName || "").trim() || "Operator";

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <p className="dashboard-eyebrow">Authenticated</p>
        <h1>{displayName}, you are in.</h1>
        <p className="dashboard-copy">
          Your Clerk session is active and the NG app is ready for authenticated routes. This
          page stays intentionally minimal until the rest of the workspace lands.
        </p>
        <dl className="dashboard-details">
          <div>
            <dt>Email</dt>
            <dd>{String(props.user?.email || "Available after sign in").trim()}</dd>
          </div>
          <div>
            <dt>Frontend stack</dt>
            <dd>React + TypeScript + Relay Runtime</dd>
          </div>
          <div>
            <dt>Next step</dt>
            <dd>Build the authenticated application flows on top of this shell.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
