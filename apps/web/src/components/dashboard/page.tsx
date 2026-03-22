import type { AuthenticatedUserDocument } from "../../auth/auth_session_store";

interface DashboardPageProps {
  user: AuthenticatedUserDocument | null;
  onSignOut: () => void;
}

export function DashboardPage(props: DashboardPageProps) {
  const displayName = String(props.user?.firstName || "").trim() || "Operator";

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <p className="dashboard-eyebrow">Authenticated</p>
        <h1>{displayName}, you are in.</h1>
        <p className="dashboard-copy">
          The auth token is stored locally and all GraphQL traffic is now wired through Relay’s
          network layer. This page is intentionally minimal until the rest of the NG app lands.
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
            <dd>Build the authenticated routes on top of this shell.</dd>
          </div>
        </dl>
        <button className="dashboard-signout" type="button" onClick={props.onSignOut}>
          Sign out
        </button>
      </section>
    </main>
  );
}
