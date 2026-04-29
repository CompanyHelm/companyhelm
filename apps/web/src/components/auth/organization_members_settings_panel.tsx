import { FormEvent, useCallback, useEffect, useState } from "react";
import { useOrganization as useClerkOrganization } from "@clerk/react";
import { MailPlusIcon, RefreshCwIcon, RotateCcwIcon, UsersIcon } from "lucide-react";
import { config } from "@/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DEFAULT_INVITATION_ROLE = "org:admin";

type OrganizationMemberRecord = {
  createdAt: Date;
  id: string;
  publicUserData?: {
    firstName: string | null;
    identifier: string;
    lastName: string | null;
  };
};

type OrganizationInvitationRecord = {
  createdAt: Date;
  emailAddress: string;
  id: string;
  revoke: () => Promise<unknown>;
  status: string;
};

type OrganizationMemberTableRecord = {
  createdAt: Date;
  emailAddress: string;
  id: string;
  name: string;
  revoke?: () => Promise<unknown>;
  status: "active" | "invited";
};

/**
 * Hosts CompanyHelm's safe organization member management surface. Clerk remains the source of
 * truth for memberships and invitation delivery, but this component avoids mounting Clerk's full
 * organization profile where admin users can reach native organization deletion.
 */
export function OrganizationMembersSettingsPanel() {
  if (config.authProvider !== "clerk") {
    return <OrganizationMembersUnavailablePanel />;
  }

  return <ClerkOrganizationMembersSettingsPanel />;
}

function ClerkOrganizationMembersSettingsPanel() {
  const organizationState = useClerkOrganization();
  const [emailAddress, setEmailAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<OrganizationInvitationRecord[]>([]);
  const [isInviting, setInviting] = useState(false);
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [members, setMembers] = useState<OrganizationMemberRecord[]>([]);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const organization = organizationState.organization;

  const loadMembers = useCallback(async () => {
    if (!organization) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [membershipResponse, invitationResponse] = await Promise.all([
        organization.getMemberships({
          pageSize: 100,
        }),
        organization.getInvitations({
          pageSize: 100,
          status: ["pending"],
        }),
      ]);
      setMembers(membershipResponse.data);
      setInvitations(invitationResponse.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load organization members.");
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || isInviting) {
      return;
    }
    if (emailAddress.length === 0) {
      setErrorMessage("Enter an email address to invite.");
      return;
    }

    setInviting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await organization.inviteMember({
        emailAddress,
        role: DEFAULT_INVITATION_ROLE,
      });
      setEmailAddress("");
      setInviteDialogOpen(false);
      setSuccessMessage(`Invitation sent to ${emailAddress}.`);
      await loadMembers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  }

  const tableRows = [
    ...members.map((member): OrganizationMemberTableRecord => ({
      createdAt: member.createdAt,
      emailAddress: member.publicUserData?.identifier ?? "No email",
      id: member.id,
      name: formatMemberName(member),
      status: "active",
    })),
    ...invitations.map((invitation): OrganizationMemberTableRecord => ({
      createdAt: invitation.createdAt,
      emailAddress: invitation.emailAddress,
      id: invitation.id,
      name: invitation.emailAddress,
      revoke: invitation.revoke,
      status: "invited",
    })),
  ];

  async function revokeInvitation(invitation: OrganizationInvitationRecord) {
    if (revokingInvitationId) {
      return;
    }

    setRevokingInvitationId(invitation.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await invitation.revoke();
      setSuccessMessage(`Invitation revoked for ${invitation.emailAddress}.`);
      await loadMembers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to revoke invitation.");
    } finally {
      setRevokingInvitationId(null);
    }
  }

  if (!organizationState.isLoaded) {
    return (
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardContent className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
          Loading members...
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardContent className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
          Select a company before managing members.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Invite teammates and review Clerk organization access.
            </CardDescription>
          </div>
          <CardAction>
            <Button onClick={() => setInviteDialogOpen(true)} size="sm" type="button">
              <MailPlusIcon />
              Invite
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {successMessage ? (
            <div className="rounded-md border border-[var(--success)]/30 bg-[var(--success-bg)] px-3 py-2 text-xs text-[var(--success)]">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {isLoading ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
              <RefreshCwIcon className="mr-2 size-4 animate-spin" />
              Loading members...
            </div>
          ) : tableRows.length === 0 ? (
            <EmptyMembersState label="No members or invitations found." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row) => (
                  <TableRow key={`${row.status}:${row.id}`}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{row.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.emailAddress}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "active" ? "positive" : "outline"}>
                        {row.status === "active" ? "Active" : "Invited"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {row.status === "invited" && row.revoke ? (
                        <Button
                          disabled={revokingInvitationId !== null}
                          onClick={() => void revokeInvitation({
                            createdAt: row.createdAt,
                            emailAddress: row.emailAddress,
                            id: row.id,
                            revoke: row.revoke as () => Promise<unknown>,
                            status: "pending",
                          })}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <RotateCcwIcon className={revokingInvitationId === row.id ? "animate-spin" : undefined} />
                          Revoke
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isInviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) {
            setEmailAddress("");
          }
        }}
      >
        <DialogContent className="w-[min(92vw,30rem)]">
          <form className="grid gap-4" onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite member</DialogTitle>
              <DialogDescription>
                Send a Clerk organization invitation. New members are added as organization admins.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoComplete="email"
              disabled={isInviting}
              onChange={(event) => setEmailAddress(event.target.value)}
              placeholder="teammate@company.com"
              type="email"
              value={emailAddress}
            />
            <DialogFooter>
              <Button disabled={isInviting} type="submit">
                <MailPlusIcon />
                Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrganizationMembersUnavailablePanel() {
  return (
    <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Clerk invitations are available when the app is running with Clerk authentication.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <EmptyMembersState label="Member invitations are not available for this auth provider." />
      </CardContent>
    </Card>
  );
}

function EmptyMembersState(props: {
  label: string;
}) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      <div className="grid justify-items-center gap-2">
        <UsersIcon className="size-5" />
        <span>{props.label}</span>
      </div>
    </div>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatMemberName(member: OrganizationMemberRecord): string {
  const firstName = member.publicUserData?.firstName;
  const lastName = member.publicUserData?.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  return fullName.length > 0 ? fullName : member.publicUserData?.identifier ?? "Member";
}
