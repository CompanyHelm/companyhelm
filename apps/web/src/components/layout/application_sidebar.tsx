import { useUser } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

const primaryNavigation = [
  "Dashboard",
  "Lifecycle",
  "Analytics",
  "Projects",
  "Team",
] as const;

const documentNavigation = [
  "Data Library",
  "Runbooks",
  "Agent Prompts",
  "Policies",
] as const;

const supportNavigation = [
  "Settings",
  "Get Help",
  "Search",
] as const;

function getInitials(firstName: string, emailAddress: string) {
  const trimmedName = firstName.trim();

  if (trimmedName) {
    return trimmedName.slice(0, 2).toUpperCase();
  }

  return emailAddress.slice(0, 2).toUpperCase() || "CH";
}

export function ApplicationSidebar() {
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

        <div className="app-sidebar__group">
          <p className="app-sidebar__label">Home</p>
          <nav className="app-sidebar__nav">
            {primaryNavigation.map((item) => (
              <Link
                key={item}
                className={cn("app-sidebar__link", item === "Dashboard" && "app-sidebar__link--active")}
                to="/"
              >
                <span>{item}</span>
                {item === "Dashboard" ? <span className="app-sidebar__dot" /> : null}
              </Link>
            ))}
          </nav>
        </div>

        <div className="app-sidebar__group">
          <p className="app-sidebar__label">Documents</p>
          <nav className="app-sidebar__nav">
            {documentNavigation.map((item) => (
              <button key={item} className="app-sidebar__link" type="button">
                <span>{item}</span>
                <span className="app-sidebar__link-meta">More</span>
              </button>
            ))}
          </nav>
        </div>

        <nav className="app-sidebar__support">
          {supportNavigation.map((item) => (
            <button key={item} className="app-sidebar__support-link" type="button">
              {item}
            </button>
          ))}
        </nav>

        <button className="app-sidebar__account" type="button">
          <span className="app-sidebar__avatar">{initials}</span>
          <span className="app-sidebar__account-copy">
            <strong>{firstName}</strong>
            <span>{emailAddress}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
