import { useClerk, useUser } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

function getInitials(firstName: string, emailAddress: string) {
  const trimmedName = firstName.trim();

  if (trimmedName) {
    return trimmedName.slice(0, 2).toUpperCase();
  }

  return emailAddress.slice(0, 2).toUpperCase() || "CH";
}

export function ApplicationSidebar() {
  const clerk = useClerk();
  const userState = useUser();
  const firstName = String(userState.user?.firstName || "").trim() || "Operator";
  const emailAddress = String(userState.user?.primaryEmailAddress?.emailAddress || "").trim()
    || "workspace@companyhelm.dev";
  const initials = getInitials(firstName, emailAddress);

  return (
    <aside className="app-sidebar" aria-label="Primary">
      <div className="app-sidebar__inner">
        <Link className="app-sidebar__brand" to="/">
          <img className="app-sidebar__brand-mark" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
          <span>CompanyHelm</span>
        </Link>

        <nav className="app-sidebar__nav app-sidebar__nav--primary">
          <Link className={cn("app-sidebar__link", "app-sidebar__link--active")} to="/">
            <span>Dashboard</span>
            <span className="app-sidebar__dot" />
          </Link>
          <button
            className="app-sidebar__link"
            type="button"
            onClick={() => {
              void clerk.openUserProfile();
            }}
          >
            <span>Profile</span>
            <span className="app-sidebar__link-meta">Clerk</span>
          </button>
        </nav>

        <div className="app-sidebar__account">
          <span className="app-sidebar__avatar">{initials}</span>
          <span className="app-sidebar__account-copy">
            <strong>{firstName}</strong>
            <span>{emailAddress}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
