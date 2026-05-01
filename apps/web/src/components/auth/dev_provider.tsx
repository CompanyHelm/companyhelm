import type { FormEvent, ReactNode } from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CompanyHelmAuthContext,
  type CompanyHelmOrganization,
  type DevAuthCompanyDocument,
  type DevAuthUserDetailDocument,
  type DevCreateCompanyInput,
  type DevSignInInput,
  type DevSignUpInput,
} from "@/auth/companyhelm_auth";
import { DevAuthClient, type DevAuthUserSummaryDocument } from "@/auth/dev_auth_client";
import { DevAuthSelectionStorage } from "@/auth/dev_auth_selection_storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrganizationPath } from "@/lib/organization_path";

type DevAuthSessionState = {
  company: DevAuthCompanyDocument;
  userDetail: DevAuthUserDetailDocument;
};

function DevAuthShell(props: {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
}) {
  return (
    <div className="w-full max-w-[32rem] rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
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

function DevUserListCard(props: {
  emptyMessage: string;
  onSelectUser(userId: string): Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<DevAuthUserSummaryDocument[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const nextUsers = await new DevAuthClient().listUsers();
        if (!cancelled) {
          setUsers(nextUsers);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading available dev users…</p>;
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {props.emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.firstName} {user.lastName || ""}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.hasActiveCompany
                ? `Primary company: ${user.primaryCompanyName || user.primaryCompanySlug || "Unknown"}`
                : "No active company yet"}
            </p>
          </div>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              void props.onSelectUser(user.id);
            }}
          >
            Continue
          </Button>
        </div>
      ))}
    </div>
  );
}

function DevSignInCard() {
  const authContext = useDevAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSelectUser(userId: string): Promise<void> {
    await authContext.devAuth.selectUser({
      userId,
    });
    await navigate({ to: "/companies" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const userDetail = await authContext.devAuth.loadUser({
        email,
      });
      const onlyCompany = userDetail.companies.length === 1
        ? userDetail.companies[0]
        : null;
      if (onlyCompany) {
        await authContext.devAuth.signIn({
          companyId: onlyCompany.id,
          userId: userDetail.user.id,
        });
        await navigate({
          params: {
            organizationSlug: onlyCompany.slug,
          },
          to: OrganizationPath.route("/"),
        });

        return;
      }

      await authContext.devAuth.selectUser({
        userId: userDetail.user.id,
      });
      await navigate({ to: "/companies" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DevAuthShell
      description="Sign in by email or choose a dev user, then select which company to impersonate. If the user only has one company, CompanyHelm opens it directly."
      footer={(
        <span className="flex flex-wrap gap-3">
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/sign-up">Choose or add a dev user</Link>
        </span>
      )}
      title="Dev sign in"
    >
      <div className="space-y-6">
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Email</span>
            <Input
              autoComplete="email"
              placeholder="jane@companyhelm.local"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {(errorMessage || authContext.devAuth.errorMessage) ? (
            <p className="text-sm text-destructive">{errorMessage || authContext.devAuth.errorMessage}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            URL shortcut: add <code>?email=…</code> or <code>?userId=…</code> to the page URL to sign in directly.
          </p>
          <Button className="w-full" disabled={submitting} size="lg" type="submit">
            {submitting ? "Loading user…" : "Continue by email"}
          </Button>
        </form>
        <div className="space-y-3 border-t border-border/70 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Available dev users</h3>
              <p className="text-xs text-muted-foreground">Pick a user first, then choose which company to open.</p>
            </div>
            <Button asChild size="sm" type="button">
              <Link to="/sign-up">Add user</Link>
            </Button>
          </div>
          <DevUserListCard
            emptyMessage="No dev users exist yet. Create one from the sign-up page."
            onSelectUser={handleSelectUser}
          />
        </div>
      </div>
    </DevAuthShell>
  );
}

function DevSignUpCard() {
  const authContext = useDevAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSelectUser(userId: string): Promise<void> {
    await authContext.devAuth.selectUser({
      userId,
    });
    await navigate({ to: "/companies" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const nextUser = await authContext.devAuth.signUp({
        email,
        firstName,
        lastName,
      });
      await authContext.devAuth.selectUser({
        userId: nextUser.user.id,
      });
      await navigate({ to: "/companies" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create the dev user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DevAuthShell
      description="Pick an existing dev user or add a new one, then choose which company to open or create."
      footer={(
        <span className="flex flex-wrap gap-3">
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/sign-in">Back to sign in</Link>
        </span>
      )}
      title="Choose dev user"
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Dev users</h3>
              <p className="text-xs text-muted-foreground">Select a user to continue to company selection.</p>
            </div>
            <Button
              size="sm"
              type="button"
              variant={isCreateFormVisible ? "outline" : "default"}
              onClick={() => {
                setIsCreateFormVisible((value) => !value);
              }}
            >
              {isCreateFormVisible ? "Hide form" : "Add user"}
            </Button>
          </div>
          <DevUserListCard
            emptyMessage="No dev users exist yet. Add the first one below."
            onSelectUser={handleSelectUser}
          />
        </div>
        {isCreateFormVisible ? (
          <form className="space-y-4 border-t border-border/70 pt-5" onSubmit={(event) => void handleSubmit(event)}>
            <div>
              <h3 className="text-sm font-medium text-foreground">Add user</h3>
              <p className="text-xs text-muted-foreground">Only the identity is required here. Companies come next.</p>
            </div>
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
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <Button className="w-full" disabled={submitting} size="lg" type="submit">
              {submitting ? "Creating user…" : "Create user"}
            </Button>
          </form>
        ) : null}
      </div>
    </DevAuthShell>
  );
}

function DevCompanyList(props: {
  companies: DevAuthCompanyDocument[];
  isSubmitting: boolean;
  onSelect(company: DevAuthCompanyDocument): Promise<void>;
}) {
  if (props.companies.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        This dev user does not belong to any companies yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {props.companies.map((company) => (
        <div
          key={company.id}
          className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
            <p className="truncate text-xs text-muted-foreground">/{company.slug}</p>
          </div>
          <Button
            disabled={props.isSubmitting}
            size="sm"
            type="button"
            onClick={() => {
              void props.onSelect(company);
            }}
          >
            Open company
          </Button>
        </div>
      ))}
    </div>
  );
}

function DevCompaniesCard() {
  const authContext = useDevAuthContext();
  const navigate = useNavigate();
  const selectedUserId = new DevAuthSelectionStorage().read().userId;
  const [companyName, setCompanyName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectingCompany, setIsSelectingCompany] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DevAuthUserDetailDocument | null>(null);
  const [submittingCompany, setSubmittingCompany] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!selectedUserId) {
        setSelectedUser(null);
        setErrorMessage("Choose a dev user before selecting a company.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextUser = await authContext.devAuth.loadUser({
          userId: selectedUserId,
        });
        if (!cancelled) {
          setSelectedUser(nextUser);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedUser(null);
          setErrorMessage(error instanceof Error ? error.message : "Failed to load the dev user.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [authContext.devAuth, selectedUserId]);

  async function handleSelectCompany(company: DevAuthCompanyDocument): Promise<void> {
    if (!selectedUser) {
      return;
    }

    setIsSelectingCompany(true);
    setErrorMessage(null);

    try {
      await authContext.devAuth.signIn({
        companyId: company.id,
        userId: selectedUser.user.id,
      });
      await navigate({
        params: {
          organizationSlug: company.slug,
        },
        replace: true,
        to: OrganizationPath.route("/"),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to open the company.");
    } finally {
      setIsSelectingCompany(false);
    }
  }

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }

    setSubmittingCompany(true);
    setErrorMessage(null);

    try {
      const nextUser = await authContext.devAuth.createCompany({
        companyName,
        userId: selectedUser.user.id,
      });
      setCompanyName("");
      setIsCreateFormVisible(false);
      setSelectedUser(nextUser);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create the company.");
    } finally {
      setSubmittingCompany(false);
    }
  }

  if (isLoading) {
    return (
      <DevAuthShell
        description="Loading the selected dev user and their companies."
        footer={<Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/sign-up">Back to users</Link>}
        title="Choose company"
      >
        <p className="text-sm text-muted-foreground">Loading companies…</p>
      </DevAuthShell>
    );
  }

  return (
    <DevAuthShell
      description="Open one of this user’s companies or create a new one before entering the workspace."
      footer={(
        <span className="flex flex-wrap gap-3">
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/sign-up">Back to users</Link>
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/sign-in">Back to sign in</Link>
        </span>
      )}
      title="Choose company"
    >
      <div className="space-y-5">
        {selectedUser ? (
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
            <p className="text-sm font-medium text-foreground">
              {selectedUser.user.firstName} {selectedUser.user.lastName || ""}
            </p>
            <p className="text-xs text-muted-foreground">{selectedUser.user.email}</p>
          </div>
        ) : null}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Companies</h3>
              <p className="text-xs text-muted-foreground">Select a company to open this user into that workspace.</p>
            </div>
            <Button
              size="sm"
              type="button"
              variant={isCreateFormVisible ? "outline" : "default"}
              onClick={() => {
                setIsCreateFormVisible((value) => !value);
              }}
            >
              {isCreateFormVisible ? "Hide form" : "Add company"}
            </Button>
          </div>
          <DevCompanyList
            companies={selectedUser?.companies ?? []}
            isSubmitting={isSelectingCompany}
            onSelect={handleSelectCompany}
          />
        </div>
        {isCreateFormVisible && selectedUser ? (
          <form className="space-y-4 border-t border-border/70 pt-5" onSubmit={(event) => void handleCreateCompany(event)}>
            <div>
              <h3 className="text-sm font-medium text-foreground">Add company</h3>
              <p className="text-xs text-muted-foreground">This creates a fresh company and attaches the selected user to it.</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Company</span>
              <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </label>
            <Button className="w-full" disabled={submittingCompany} size="lg" type="submit">
              {submittingCompany ? "Creating company…" : "Create company"}
            </Button>
          </form>
        ) : null}
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>
    </DevAuthShell>
  );
}

function resolveInitials(name: {
  firstName: string;
  lastName: string | null;
}): string {
  const firstCharacter = name.firstName.trim().charAt(0).toUpperCase();
  const lastCharacter = String(name.lastName || "").trim().charAt(0).toUpperCase();
  return `${firstCharacter}${lastCharacter}`.trim() || "U";
}

function useDevAuthContext(): ReturnType<typeof useContextOrThrow> & {
  devAuth: NonNullable<ReturnType<typeof useContextOrThrow>["devAuth"]>;
} {
  const context = useContextOrThrow();
  if (!context.devAuth) {
    throw new Error("Dev auth actions are unavailable.");
  }

  return context as ReturnType<typeof useContextOrThrow> & {
    devAuth: NonNullable<ReturnType<typeof useContextOrThrow>["devAuth"]>;
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
 * Provides the shared CompanyHelm auth context from the dev-only selection flow. Instead of JWTs,
 * it restores the chosen user and company from local storage and emits the explicit dev headers on
 * every GraphQL request.
 */
export function CompanyHelmDevProvider(props: {
  children: ReactNode;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [session, setSession] = useState<DevAuthSessionState | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const client = new DevAuthClient();
    const storage = new DevAuthSelectionStorage();

    async function loadStoredSelection() {
      const selection = storage.read();
      if (!selection.userId || !selection.companyId) {
        if (!isCancelled) {
          setSession(null);
          setErrorMessage(null);
          setIsLoaded(true);
        }
        return;
      }

      try {
        const userDetail = await client.loadUser({
          userId: selection.userId,
        });
        const company = userDetail.companies.find((entry) => entry.id === selection.companyId) ?? null;
        if (!company) {
          storage.clear();
          if (!isCancelled) {
            setSession(null);
            setErrorMessage(null);
          }
          return;
        }

        if (!isCancelled) {
          setSession({
            company,
            userDetail,
          });
          setErrorMessage(null);
        }
      } catch {
        storage.clear();
        if (!isCancelled) {
          setSession(null);
          setErrorMessage(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoaded(true);
        }
      }
    }

    void loadStoredSelection();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function selectUser(input: {
    userId: string;
  }): Promise<void> {
    new DevAuthSelectionStorage().selectUser(input);
    setSession(null);
    setErrorMessage(null);
    setIsLoaded(true);
  }

  async function signIn(input: DevSignInInput): Promise<void> {
    const userDetail = await new DevAuthClient().loadUser({
      userId: input.userId,
    });
    const company = userDetail.companies.find((entry) => entry.id === input.companyId) ?? null;
    if (!company) {
      throw new Error("This user is not assigned to the requested company.");
    }

    new DevAuthSelectionStorage().selectCompany(input);
    setSession({
      company,
      userDetail,
    });
    setErrorMessage(null);
    setIsLoaded(true);
  }

  async function signUp(input: DevSignUpInput): Promise<DevAuthUserDetailDocument> {
    return await new DevAuthClient().signUp(input);
  }

  async function createCompany(input: DevCreateCompanyInput): Promise<DevAuthUserDetailDocument> {
    return await new DevAuthClient().createCompany(input);
  }

  async function loadUser(input: {
    email?: string;
    userId?: string;
  }): Promise<DevAuthUserDetailDocument> {
    return await new DevAuthClient().loadUser(input);
  }

  async function signOut(): Promise<void> {
    new DevAuthSelectionStorage().clear();
    setSession(null);
    setErrorMessage(null);
    setIsLoaded(true);
  }

  const activeOrganization: CompanyHelmOrganization | null = session
    ? {
      id: session.company.id,
      name: session.company.name,
      slug: session.company.slug,
    }
    : null;

  const contextValue = useMemo(() => ({
    auth: {
      getRequestHeaders: async () => {
        const headers: Record<string, string> = {};
        if (session) {
          headers["x-dev-company-id"] = session.company.id;
          headers["x-dev-user-id"] = session.userDetail.user.id;
        }

        return headers;
      },
      getToken: async () => null,
      isLoaded,
      isSignedIn: session !== null,
      userId: session?.userDetail.user.id ?? null,
    },
    devAuth: {
      createCompany,
      errorMessage,
      loadUser,
      selectUser,
      signIn,
      signOut,
      signUp,
    },
    localAuth: null,
    organization: {
      isLoaded,
      organization: activeOrganization,
    },
    organizationList: {
      isLoaded,
      setActive: async (input: {
        organization: string;
      }) => {
        if (!session) {
          return;
        }

        if (input.organization === session.company.id) {
          return;
        }

        const nextCompany = session.userDetail.companies.find((company) => company.id === input.organization) ?? null;
        if (!nextCompany) {
          throw new Error("Dev auth selection is not attached to that company.");
        }

        await signIn({
          companyId: nextCompany.id,
          userId: session.userDetail.user.id,
        });
      },
      userMemberships: {
        data: session?.userDetail.companies.map((company) => ({
          organization: {
            id: company.id,
            name: company.name,
            slug: company.slug,
          },
        })) ?? [],
      },
    },
    provider: "dev" as const,
    user: {
      isLoaded,
      user: session
        ? {
          firstName: session.userDetail.user.firstName,
          id: session.userDetail.user.id,
          lastName: session.userDetail.user.lastName,
          primaryEmailAddress: {
            emailAddress: session.userDetail.user.email,
          },
        }
        : null,
    },
  }), [activeOrganization, errorMessage, isLoaded, session]);

  return (
    <CompanyHelmAuthContext.Provider value={contextValue}>
      {props.children}
    </CompanyHelmAuthContext.Provider>
  );
}

export function DevOrganizationSwitcher() {
  const context = useContextOrThrow();
  const organization = context.organization.organization;
  if (!organization) {
    return null;
  }

  return (
    <div className="rounded-md border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-foreground">
      <p className="font-medium">{organization.name}</p>
      <p className="text-xs text-sidebar-foreground/70">Dev auth</p>
    </div>
  );
}

export function DevOrganizationList() {
  const context = useContextOrThrow();

  if (context.organizationList.userMemberships.data.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        No companies are attached to this dev user yet.
      </div>
    );
  }

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

export function DevSignIn() {
  return <DevSignInCard />;
}

export function DevSignUp() {
  return <DevSignUpCard />;
}

export function DevCompanies() {
  return <DevCompaniesCard />;
}

export function DevUserButton() {
  const context = useDevAuthContext();
  const user = context.user.user;
  if (!user) {
    return null;
  }

  return (
    <button
      className="flex size-8 items-center justify-center rounded-full border border-sidebar-border/70 bg-sidebar-accent/40 text-xs font-semibold text-sidebar-foreground transition hover:bg-sidebar-accent"
      onClick={() => {
        void context.devAuth.signOut();
      }}
      title="Sign out"
      type="button"
    >
      {resolveInitials(user)}
    </button>
  );
}
