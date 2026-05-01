import type { FormEvent, ReactNode } from "react";
import { useContext, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CompanyHelmAuthContext, type CompanyHelmOrganization, type LocalSignInInput, type LocalSignUpInput } from "@/auth/companyhelm_auth";
import { LocalAuthClient, type LocalAuthSessionDocument } from "@/auth/local_auth_client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrganizationPath } from "@/lib/organization_path";

const LOCAL_AUTH_STORAGE_KEY = "companyhelm.local-auth.session-token";

function LocalAuthShell(props: {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
}) {
  return (
    <div className="w-full max-w-[30rem] rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{props.title}</h2>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </div>
      <div className="mt-6">
        {props.children}
      </div>
      <div className="mt-5 text-sm text-muted-foreground">
        {props.footer}
      </div>
    </div>
  );
}

function LocalSignInCard() {
  const authContext = useLocalAuthContext();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await authContext.localAuth.signIn({
        email,
        password,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LocalAuthShell
      description="Use your CompanyHelm email and password to open the workspace without Clerk."
      footer={(
        <span>
          Need an account? <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/sign-up">Create one</Link>
        </span>
      )}
      title="Sign in"
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Email</span>
          <Input autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Password</span>
          <Input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        <Button className="w-full" disabled={submitting} size="lg" type="submit">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </LocalAuthShell>
  );
}

function LocalSignUpCard() {
  const authContext = useLocalAuthContext();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await authContext.localAuth.signUp({
        companyName,
        email,
        firstName,
        lastName,
        password,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign up.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LocalAuthShell
      description="Create the first CompanyHelm workspace user and company when local auth is enabled."
      footer={(
        <span>
          Already have an account? <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/sign-in">Sign in</Link>
        </span>
      )}
      title="Sign up"
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Company</span>
          <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">First name</span>
            <Input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Last name</span>
            <Input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Email</span>
          <Input autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Password</span>
          <Input
            autoComplete="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        <Button className="w-full" disabled={submitting} size="lg" type="submit">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </LocalAuthShell>
  );
}

function resolveOrganization(
  session: LocalAuthSessionDocument | null,
): CompanyHelmOrganization | null {
  if (!session) {
    return null;
  }

  return session.organizations.find((organization) => organization.id === session.activeOrganizationId)
    ?? session.organizations[0]
    ?? null;
}

function resolveInitials(name: {
  firstName: string;
  lastName: string | null;
}): string {
  const firstCharacter = name.firstName.trim().charAt(0).toUpperCase();
  const lastCharacter = String(name.lastName || "").trim().charAt(0).toUpperCase();
  return `${firstCharacter}${lastCharacter}`.trim() || "U";
}

function useLocalAuthContext(): ReturnType<typeof useContextOrThrow> & {
  localAuth: NonNullable<ReturnType<typeof useContextOrThrow>["localAuth"]>;
} {
  const context = useContextOrThrow();
  if (!context.localAuth) {
    throw new Error("Local auth actions are unavailable.");
  }

  return context as ReturnType<typeof useContextOrThrow> & {
    localAuth: NonNullable<ReturnType<typeof useContextOrThrow>["localAuth"]>;
  };
}

function useContextOrThrow() {
  const context = useContext(CompanyHelmAuthContext);
  if (!context) {
    throw new Error("CompanyHelm auth context is unavailable.");
  }

  return context;
}

/**
 * Provides the shared CompanyHelm auth context from the local credential endpoints and keeps the
 * active bearer token in local storage across page reloads.
 */
export function CompanyHelmLocalProvider(props: {
  children: ReactNode;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [session, setSession] = useState<LocalAuthSessionDocument | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const client = new LocalAuthClient();

    async function loadStoredSession() {
      if (typeof window === "undefined") {
        if (!isCancelled) {
          setIsLoaded(true);
        }
        return;
      }

      const storedToken = window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY);
      if (!storedToken) {
        if (!isCancelled) {
          setIsLoaded(true);
          setSession(null);
        }
        return;
      }

      try {
        const nextSession = await client.loadSession(storedToken);
        if (!isCancelled) {
          window.localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, nextSession.token);
          setSession(nextSession);
        }
      } catch {
        if (!isCancelled) {
          window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
          setSession(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoaded(true);
        }
      }
    }

    void loadStoredSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function persistSession(nextSession: LocalAuthSessionDocument): Promise<void> {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, nextSession.token);
    }

    setSession(nextSession);
    setIsLoaded(true);
  }

  async function clearSession(): Promise<void> {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
    }

    setSession(null);
    setIsLoaded(true);
  }

  async function signIn(input: LocalSignInInput): Promise<void> {
    const nextSession = await new LocalAuthClient().signIn(input);
    await persistSession(nextSession);
  }

  async function signUp(input: LocalSignUpInput): Promise<void> {
    const nextSession = await new LocalAuthClient().signUp(input);
    await persistSession(nextSession);
  }

  async function signOut(): Promise<void> {
    const token = session?.token ?? (typeof window === "undefined" ? null : window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY));
    await clearSession();

    if (!token) {
      return;
    }

    try {
      await new LocalAuthClient().signOut(token);
    } catch {
      return;
    }
  }

  const activeOrganization = resolveOrganization(session);

  return (
    <CompanyHelmAuthContext.Provider
      value={{
        auth: {
          getRequestHeaders: async () => {
            const headers: Record<string, string> = {};
            if (session?.token) {
              headers.authorization = `Bearer ${session.token}`;
            }

            return headers;
          },
          getToken: async () => session?.token ?? null,
          isLoaded,
          isSignedIn: session !== null,
          userId: session?.user.id ?? null,
        },
        devAuth: null,
        localAuth: {
          signIn,
          signOut,
          signUp,
        },
        organization: {
          isLoaded,
          organization: activeOrganization,
        },
        organizationList: {
          isLoaded,
          setActive: async (input) => {
            if (!activeOrganization || input.organization === activeOrganization.id) {
              return;
            }

            throw new Error("Local auth sessions currently support one company at a time.");
          },
          userMemberships: {
            data: session?.organizations.map((organization) => ({
              organization,
            })) ?? [],
          },
        },
        provider: "local",
        user: {
          isLoaded,
          user: session
            ? {
              firstName: session.user.firstName,
              id: session.user.id,
              lastName: session.user.lastName,
              primaryEmailAddress: {
                emailAddress: session.user.email,
              },
            }
            : null,
        },
      }}
    >
      {props.children}
    </CompanyHelmAuthContext.Provider>
  );
}

export function LocalOrganizationSwitcher() {
  const context = useContextOrThrow();
  const organization = context.organization.organization;
  if (!organization) {
    return null;
  }

  return (
    <div className="rounded-md border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-foreground">
      <p className="font-medium">{organization.name}</p>
      <p className="text-xs text-sidebar-foreground/70">Local auth</p>
    </div>
  );
}

export function LocalOrganizationList() {
  const context = useContextOrThrow();

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <p className="text-sm font-medium text-foreground">Available companies</p>
      <div className="mt-3 flex flex-col gap-2">
        {context.organizationList.userMemberships.data.map((membership) => (
          <Link
            key={membership.organization.id}
            className="inline-flex rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            params={{ organizationSlug: membership.organization.slug }}
            to={OrganizationPath.route("/")}
          >
            Open {membership.organization.slug}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function LocalSignIn() {
  return <LocalSignInCard />;
}

export function LocalSignUp() {
  return <LocalSignUpCard />;
}

export function LocalUserButton() {
  const context = useLocalAuthContext();
  const user = context.user.user;
  if (!user) {
    return null;
  }

  return (
    <button
      className="flex size-8 items-center justify-center rounded-full border border-sidebar-border/70 bg-sidebar-accent/40 text-xs font-semibold text-sidebar-foreground transition hover:bg-sidebar-accent"
      onClick={() => {
        void context.localAuth.signOut();
      }}
      title="Sign out"
      type="button"
    >
      {resolveInitials(user)}
    </button>
  );
}
