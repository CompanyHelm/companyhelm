import { SignIn, SignUp } from "@clerk/react";

export type ClerkPageMode = "signIn" | "signUp";

interface ClerkPageProps {
  mode: ClerkPageMode;
}

const clerkAppearance = {
  elements: {
    rootBox: "flex w-full min-w-0 justify-center",
    cardBox: "w-full max-w-[30rem] min-w-0",
    card: "w-full min-w-0",
    main: "w-full min-w-0",
  },
} as const;

export function ClerkPage(props: ClerkPageProps) {
  return (
    <main className="auth-shell">
      <section className="auth-shell__hero">
        <div className="auth-shell__brand">
          <img className="auth-shell__brand-mark" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
          <span className="auth-shell__brand-name">CompanyHelm</span>
        </div>
        <h1>Welcome to CompanyHelm.</h1>
        <p>
          Coordinate agents, tasks, chats, and execution environments from one operator workspace
          built for teams shipping real work with AI.
        </p>
      </section>

      <section className="auth-shell__panel">
        {props.mode === "signIn" ? (
          <SignIn appearance={clerkAppearance} signUpUrl="/sign-up" forceRedirectUrl="/" />
        ) : (
          <SignUp appearance={clerkAppearance} signInUrl="/sign-in" forceRedirectUrl="/" />
        )}
      </section>
    </main>
  );
}
