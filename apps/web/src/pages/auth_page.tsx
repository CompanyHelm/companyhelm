import { useMemo, useState, type FormEvent } from "react";
import type { SignInInputDocument, SignUpInputDocument } from "../auth/auth_client";

export type AuthPageMode = "signIn" | "signUp";

interface AuthPageProps {
  mode: AuthPageMode;
  isSubmitting: boolean;
  errorMessage: string;
  onSubmit: (input: SignInInputDocument | SignUpInputDocument) => Promise<void>;
  onNavigateToSignIn: () => void;
  onNavigateToSignUp: () => void;
}

interface AuthFormStateDocument {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const INITIAL_FORM_STATE: AuthFormStateDocument = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

export function AuthPage(props: AuthPageProps) {
  const [formState, setFormState] = useState<AuthFormStateDocument>(INITIAL_FORM_STATE);
  const isSignInMode = props.mode === "signIn";

  const heading = useMemo(
    () => (isSignInMode ? "Welcome back" : "Provision operator account"),
    [isSignInMode],
  );

  const eyebrow = useMemo(
    () => (isSignInMode ? "Operator access node" : "Bootstrap operator access"),
    [isSignInMode],
  );

  const submitLabel = useMemo(
    () => (props.isSubmitting ? "Negotiating..." : isSignInMode ? "Authenticate" : "Create operator"),
    [isSignInMode, props.isSubmitting],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (props.isSubmitting) {
      return;
    }

    if (isSignInMode) {
      await props.onSubmit({
        email: formState.email.trim(),
        password: formState.password,
      });
      return;
    }

    await props.onSubmit({
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      email: formState.email.trim(),
      password: formState.password,
    });
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-panel-header">
          <div className="auth-status-row">
            <span className="auth-status-chip">SYSTEM ONLINE</span>
            <span className="auth-status-meta">{isSignInMode ? "LOCAL AUTH FLOW" : "OPERATOR ONBOARDING"}</span>
          </div>

          <div className="auth-logo-lockup">
            <img className="auth-logo-mark" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
            <div className="auth-logo-copy">
              <span className="auth-logo-text">CompanyHelm</span>
              <h1 className="auth-panel-title">{heading}</h1>
            </div>
          </div>

          <p className="auth-eyebrow">{eyebrow}</p>
          <p className="auth-panel-copy">
            {isSignInMode
              ? "Access the control surface for agent operations, session issuance, and GraphQL transport."
              : "Create the first operator identity for this environment and initialize the local auth session."}
          </p>

          <div className="auth-signal-grid" aria-hidden="true">
            <div>
              <span>AUTH</span>
              <strong>JWT</strong>
            </div>
            <div>
              <span>TRANSPORT</span>
              <strong>GRAPHQL</strong>
            </div>
            <div>
              <span>MODE</span>
              <strong>LOCAL</strong>
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
          {!isSignInMode ? (
            <label>
              First name
              <input
                type="text"
                name="firstName"
                value={formState.firstName}
                onChange={(event) => setFormState({ ...formState, firstName: event.target.value })}
                autoComplete="given-name"
                required
              />
            </label>
          ) : null}

          {!isSignInMode ? (
            <label>
              Last name
              <input
                type="text"
                name="lastName"
                value={formState.lastName}
                onChange={(event) => setFormState({ ...formState, lastName: event.target.value })}
                autoComplete="family-name"
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={(event) => setFormState({ ...formState, email: event.target.value })}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={formState.password}
              onChange={(event) => setFormState({ ...formState, password: event.target.value })}
              autoComplete={isSignInMode ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </label>

          {props.errorMessage ? <p className="auth-error">{props.errorMessage}</p> : null}

          <button className="auth-submit" type="submit" disabled={props.isSubmitting}>
            {submitLabel}
          </button>
        </form>

        <p className="auth-route-copy">
          {isSignInMode ? "Need an operator record?" : "Already provisioned?"}
          {" "}
          <button type="button" onClick={isSignInMode ? props.onNavigateToSignUp : props.onNavigateToSignIn}>
            {isSignInMode ? "Create one" : "Authenticate"}
          </button>
        </p>

        <p className="auth-footnote">
          Email-password auth is the active transport in this environment. External providers stay
          disabled until their control paths are wired.
        </p>
      </section>
    </main>
  );
}
