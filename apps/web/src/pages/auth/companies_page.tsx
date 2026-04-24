import { Companies } from "@/components/auth/auth_provider";

export function CompaniesPage() {
  return (
    <main className="auth-shell">
      <section className="auth-shell__hero">
        <div className="auth-shell__brand">
          <img className="auth-shell__brand-mark" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
          <span className="auth-shell__brand-name">CompanyHelm</span>
        </div>
        <h1>Choose a company.</h1>
        <p>
          Dev auth now separates user creation from company selection so you can reuse a test user
          across multiple workspaces.
        </p>
      </section>

      <section className="auth-shell__panel">
        <Companies />
      </section>
    </main>
  );
}
