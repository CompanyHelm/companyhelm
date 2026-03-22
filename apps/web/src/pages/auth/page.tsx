import { SignIn, SignUp } from "@clerk/react";

export type ClerkPageMode = "signIn" | "signUp";

interface ClerkPageProps {
  mode: ClerkPageMode;
}

export function ClerkPage(props: ClerkPageProps) {
  return (
    <main className="auth-shell">
      {props.mode === "signIn" ? (
        <SignIn signUpUrl="/sign-up" forceRedirectUrl="/" />
      ) : (
        <SignUp signInUrl="/sign-in" forceRedirectUrl="/" />
      )}
    </main>
  );
}
