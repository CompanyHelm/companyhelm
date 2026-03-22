import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer(props: PageContainerProps) {
  return (
    <div className="page-container">
      <header className="app-header">
        <Link className="app-header-brand" to="/">
          <img className="app-header-brand-mark" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
          <span className="app-header-brand-copy">
            <span className="app-header-brand-title">CompanyHelm</span>
            <span className="app-header-brand-subtitle">Operator workspace</span>
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

      <div className="page-container-content">{props.children}</div>

      <footer className="page-container-footer">
        <p className="page-container-footer-copy">CompanyHelm NG</p>
        <p className="page-container-footer-copy page-container-footer-copy--muted">
          Authenticated operations for agent-native teams.
        </p>
      </footer>
    </div>
  );
}
