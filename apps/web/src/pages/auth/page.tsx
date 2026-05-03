import { SignIn, SignUp } from "@/components/auth/auth_provider";

export type AuthenticationPageMode = "signIn" | "signUp";

interface AuthenticationPageProps {
  mode: AuthenticationPageMode;
}

const authenticationAppearance = {
  elements: {
    rootBox: "flex w-full min-w-0 justify-center",
    cardBox: "w-full max-w-[30rem] min-w-0",
    card: "w-full min-w-0",
    main: "w-full min-w-0",
  },
} as const;

export function AuthenticationPage(props: AuthenticationPageProps) {
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
          <SignIn appearance={authenticationAppearance} signUpUrl="/sign-up" forceRedirectUrl="/" />
        ) : (
          <SignUp appearance={authenticationAppearance} signInUrl="/sign-in" forceRedirectUrl="/signed-up" />
        )}
      </section>
    </main>
  );
}
