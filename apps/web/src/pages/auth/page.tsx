import { SignIn, SignUp } from "@clerk/react";

export type ClerkPageMode = "signIn" | "signUp";

interface ClerkPageProps {
  mode: ClerkPageMode;
}

export function ClerkPage(props: ClerkPageProps) {
  return (
    <main className="auth-shell">
      <section className="auth-shell__hero">
        <p className="auth-shell__eyebrow">CompanyHelm</p>
        <h1>Operator workspace access.</h1>
        <p>
          Authenticate to enter the document and execution surface rebuilt around the shadcn
          dashboard composition model.
        </p>
      </section>

      <section className="auth-shell__panel">
        {props.mode === "signIn" ? (
          <SignIn signUpUrl="/sign-up" forceRedirectUrl="/" />
        ) : (
          <SignUp signInUrl="/sign-in" forceRedirectUrl="/" />
        )}
      </section>
    </main>
  );
}
