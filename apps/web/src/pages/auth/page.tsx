import { SignIn, SignUp } from "@clerk/react";

export type ClerkPageMode = "signIn" | "signUp";

interface ClerkPageProps {
  mode: ClerkPageMode;
}

export function ClerkPage(props: ClerkPageProps) {
  const isSignInMode = props.mode === "signIn";

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-panel--clerk">
        <div className="auth-panel-header">
          <div className="auth-logo-lockup">
            <img className="auth-logo-mark" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
            <div className="auth-logo-copy">
              <span className="auth-logo-text">CompanyHelm</span>
              <h1 className="auth-panel-title">{isSignInMode ? "Welcome back" : "Create account"}</h1>
            </div>
          </div>
          <p className="auth-eyebrow">{isSignInMode ? "Clerk sign in" : "Clerk sign up"}</p>
          <p className="auth-panel-copy">
            {isSignInMode
              ? "Use your Clerk session to access the operator workspace."
              : "Create a Clerk-backed account for CompanyHelm NG."}
          </p>
        </div>

        {isSignInMode ? (
          <SignIn signUpUrl="/sign-up" forceRedirectUrl="/app" />
        ) : (
          <SignUp signInUrl="/sign-in" forceRedirectUrl="/app" />
        )}
      </section>
    </main>
  );
}
