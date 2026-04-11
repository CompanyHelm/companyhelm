import { useEffect, useMemo, useState } from "react";
import { OrganizationList, useOrganization, useOrganizationList } from "@clerk/react";
import { Outlet, useParams } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";

/**
 * Keeps Clerk's active organization aligned with the slug embedded in the current URL so separate
 * tabs can point at different companies without relying on one shared browser-wide org selection.
 */
export function OrganizationRoute() {
  const routeParams = useParams({ strict: false }) as {
    organizationSlug?: string;
  };
  const organizationSlug = routeParams.organizationSlug ?? null;
  const organizationState = useOrganization();
  const organizationListState = useOrganizationList({
    userMemberships: {
      keepPreviousData: true,
      pageSize: 100,
    },
  });
  const [activationErrorMessage, setActivationErrorMessage] = useState<string | null>(null);
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(null);
  const activeOrganizationSlug = organizationState.organization?.slug ?? null;
  const canActivateOrganization = Boolean(organizationListState.setActive);
  const matchingMembership = useMemo(() => {
    return organizationListState.userMemberships.data?.find((membership) =>
      membership.organization.slug === organizationSlug
    ) ?? null;
  }, [organizationListState.userMemberships.data, organizationSlug]);
  const isLoaded = organizationState.isLoaded && organizationListState.isLoaded;
  if (!organizationSlug || organizationSlug.trim().length === 0) {
    throw new Error("Organization route is missing the organization slug.");
  }

  useEffect(() => {
    setActivationErrorMessage(null);
    setPendingOrganizationId(null);
  }, [organizationSlug]);

  useEffect(() => {
    if (!isLoaded || activeOrganizationSlug === organizationSlug || !matchingMembership || !organizationListState.setActive) {
      return;
    }

    const organizationId = matchingMembership.organization.id;
    if (pendingOrganizationId === organizationId) {
      return;
    }

    setPendingOrganizationId(organizationId);
    void organizationListState.setActive({
      organization: organizationId,
    }).catch((error) => {
      setPendingOrganizationId(null);
      setActivationErrorMessage(error instanceof Error ? error.message : "Failed to activate organization.");
    });
  }, [
    activeOrganizationSlug,
    isLoaded,
    matchingMembership,
    organizationListState,
    organizationListState.setActive,
    organizationSlug,
    pendingOrganizationId,
  ]);

  if (!isLoaded) {
    return null;
  }

  if (activeOrganizationSlug === organizationSlug) {
    return <Outlet />;
  }

  if (matchingMembership && !activationErrorMessage && canActivateOrganization) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Loader2Icon className="size-4 animate-spin text-foreground" />
          <span>
            Switching to <span className="font-medium text-foreground">{organizationSlug}</span>…
          </span>
        </div>
      </div>
    );
  }

  const unavailableMessage = activationErrorMessage
    ?? (matchingMembership
      ? "Your Clerk session found this company, but could not activate it."
      : null);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Company not available</h1>
          <p className="text-sm text-muted-foreground">
            The URL points to <span className="font-medium text-foreground">{organizationSlug}</span>, but your current
            Clerk session cannot activate that company.
          </p>
          {unavailableMessage ? (
            <p className="text-sm text-destructive">{unavailableMessage}</p>
          ) : null}
        </div>
        <OrganizationList
          afterCreateOrganizationUrl="/orgs/:slug"
          afterSelectOrganizationUrl="/orgs/:slug"
          hidePersonal
        />
      </div>
    </div>
  );
}
