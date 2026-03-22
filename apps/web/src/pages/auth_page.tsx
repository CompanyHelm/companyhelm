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
    () => (isSignInMode ? "Command center sign in" : "Create your CompanyHelm workspace"),
    [isSignInMode],
  );

  const eyebrow = useMemo(
    () => (isSignInMode ? "Secure access" : "New workspace"),
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
      <section className="auth-copy-panel">
        <p className="auth-eyebrow">{eyebrow}</p>
        <h1>{heading}</h1>
        <p className="auth-lead">
          Relay-backed authentication for the next CompanyHelm frontend. The flow mirrors the
          existing product, but the presentation is cleaner and the entry points are split into
          dedicated sign-in and sign-up routes.
        </p>
        <div className="auth-highlights">
          <article>
            <span>01</span>
            <strong>Fast bootstrap</strong>
            <p>Direct GraphQL mutations against the local API, no second client stack.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Typed front end</strong>
            <p>React + TypeScript from the first render, with a single auth session store.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Separate routes</strong>
            <p>Dedicated sign-in and sign-up pages instead of hiding both modes in one gate.</p>
          </article>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-header">
          <p className="auth-brand">CompanyHelm NG</p>
          <p className="auth-panel-title">{isSignInMode ? "Welcome back" : "Get started"}</p>
          <p className="auth-panel-copy">
            {isSignInMode
              ? "Use your CompanyHelm credentials to continue."
              : "Create an operator account for the new React frontend."}
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

        <div className="auth-route-switch">
          <span>{isSignInMode ? "Need access?" : "Already registered?"}</span>
          <button type="button" onClick={isSignInMode ? props.onNavigateToSignUp : props.onNavigateToSignIn}>
            {isSignInMode ? "Create an account" : "Go to sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
