import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import { config } from "../../config";

export function ApplicationHeader() {
  if (config.authProvider !== "clerk") {
    return null;
  }

  return (
    <header className="app-header">
      <Link className="app-header-brand" to="/app">
        <img className="app-header-brand-mark" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
        <span className="app-header-brand-copy">
          <span className="app-header-brand-title">CompanyHelm</span>
          <span className="app-header-brand-subtitle">Clerk access</span>
        </span>
      </Link>

      <div className="app-header-actions">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="app-header-action" type="button">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="app-header-action app-header-action--primary" type="button">
              Sign up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
