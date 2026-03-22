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
    () => (isSignInMode ? "Welcome back" : "Create account"),
    [isSignInMode],
  );

  const eyebrow = useMemo(
    () => (isSignInMode ? "Operator access" : "Join the operator workspace"),
    [isSignInMode],
  );

  const submitLabel = useMemo(
    () => (props.isSubmitting ? "Working..." : isSignInMode ? "Sign in" : "Create account"),
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
              ? "OPERATIONS FOR AI AGENTS"
              : "SET UP YOUR OPERATOR WORKSPACE"}
          </p>
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
          {isSignInMode ? "Don't have an account?" : "Already have an account?"}
          {" "}
          <button type="button" onClick={isSignInMode ? props.onNavigateToSignUp : props.onNavigateToSignIn}>
            {isSignInMode ? "Sign up" : "Sign in"}
          </button>
        </p>

        <div className="auth-divider" aria-hidden="true">
          <span>Or</span>
        </div>

        <div className="auth-secondary-actions">
          <button type="button" className="auth-provider-button" onClick={props.onNavigateToSignIn}>
            <span className="auth-provider-icon auth-provider-icon-google" aria-hidden="true">
              G
            </span>
            Continue with email login
          </button>
          <button type="button" className="auth-provider-button" onClick={props.onNavigateToSignUp}>
            <span className="auth-provider-icon auth-provider-icon-github" aria-hidden="true">
              GH
            </span>
            {isSignInMode ? "Create a CompanyHelm account" : "Return to sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
