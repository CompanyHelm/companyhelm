import { CreateCompany } from "@/components/auth/auth_provider";

export function CreateCompanyPage() {
  return (
    <main className="auth-shell">
      <section className="auth-shell__hero">
        <div className="auth-shell__brand">
          <img className="auth-shell__brand-mark" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
          <span className="auth-shell__brand-name">CompanyHelm</span>
        </div>
        <h1>Create a company.</h1>
        <p>
          CompanyHelm can attach an existing test user to a fresh company so you can jump straight
          into a clean workspace.
        </p>
      </section>

      <section className="auth-shell__panel">
        <CreateCompany />
      </section>
    </main>
  );
}
