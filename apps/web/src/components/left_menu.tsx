import { useUser } from "@clerk/react";
import { Link } from "@tanstack/react-router";

export function LeftMenu() {
  const userState = useUser();
  const displayName = String(userState.user?.firstName || "").trim() || "Operator";
  const emailAddress = String(userState.user?.primaryEmailAddress?.emailAddress || "").trim();

  return (
    <aside className="left-menu" aria-label="Workspace navigation">
      <div className="left-menu-panel">
        <p className="left-menu-eyebrow">Workspace</p>
        <div className="left-menu-user">
          <p className="left-menu-user-name">{displayName}</p>
          <p className="left-menu-user-email">{emailAddress || "Signed-in workspace access"}</p>
        </div>

        <nav className="left-menu-nav">
          <Link className="left-menu-link left-menu-link--active" to="/">
            <span className="left-menu-link-label">Overview</span>
            <span className="left-menu-link-meta">Live</span>
          </Link>
          <button className="left-menu-link" type="button">
            <span className="left-menu-link-label">Agents</span>
            <span className="left-menu-link-meta">Soon</span>
          </button>
          <button className="left-menu-link" type="button">
            <span className="left-menu-link-label">Runs</span>
            <span className="left-menu-link-meta">Soon</span>
          </button>
          <button className="left-menu-link" type="button">
            <span className="left-menu-link-label">Policies</span>
            <span className="left-menu-link-meta">Soon</span>
          </button>
        </nav>

        <div className="left-menu-callout">
          <p className="left-menu-callout-label">System pulse</p>
          <strong>Clerk session connected</strong>
          <span>Use this rail as the persistent workspace anchor while the app surface grows.</span>
        </div>
      </div>
    </aside>
  );
}
