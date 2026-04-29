import { FormEvent, useCallback, useEffect, useState } from "react";
import { useOrganization as useClerkOrganization } from "@clerk/react";
import { MailPlusIcon, RefreshCwIcon, RotateCcwIcon, UsersIcon } from "lucide-react";
import { config } from "@/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InvitationRole = "org:admin" | "org:member";

type OrganizationMemberRecord = {
  createdAt: Date;
  id: string;
  publicUserData?: {
    firstName: string | null;
    identifier: string;
    lastName: string | null;
  };
  role: string;
  roleName: string;
};

type OrganizationInvitationRecord = {
  createdAt: Date;
  emailAddress: string;
  id: string;
  revoke: () => Promise<unknown>;
  role: string;
  roleName: string;
  status: string;
};

const INVITATION_ROLE_OPTIONS: Array<{
  label: string;
  value: InvitationRole;
}> = [
  {
    label: "Member",
    value: "org:member",
  },
  {
    label: "Admin",
    value: "org:admin",
  },
];

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
  const [invitationRole, setInvitationRole] = useState<InvitationRole>("org:member");
  const [invitations, setInvitations] = useState<OrganizationInvitationRecord[]>([]);
  const [isInviting, setInviting] = useState(false);
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
        role: invitationRole,
      });
      setEmailAddress("");
      setSuccessMessage(`Invitation sent to ${emailAddress}.`);
      await loadMembers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  }

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
              Invite teammates and review active Clerk organization access.
            </CardDescription>
          </div>
          <CardAction>
            <Button disabled={isLoading} onClick={() => void loadMembers()} size="sm" type="button" variant="outline">
              <RefreshCwIcon className={isLoading ? "animate-spin" : undefined} />
              Refresh
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form className="grid gap-3 rounded-xl border border-border/70 bg-background/90 p-4" onSubmit={handleInvite}>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MailPlusIcon className="size-4 text-muted-foreground" />
              <span>Invite member</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-center">
              <Input
                autoComplete="email"
                disabled={isInviting}
                onChange={(event) => setEmailAddress(event.target.value)}
                placeholder="teammate@company.com"
                type="email"
                value={emailAddress}
              />
              <Select<InvitationRole>
                disabled={isInviting}
                onValueChange={(value) => {
                  if (value) {
                    setInvitationRole(value);
                  }
                }}
                value={invitationRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITATION_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={isInviting} type="submit">
                <MailPlusIcon />
                Invite
              </Button>
            </div>
          </form>

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
        </CardContent>
      </Card>

      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Active members</CardTitle>
            <CardDescription>
              People who can currently access {organization.name}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <EmptyMembersState label="No active members found." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{formatMemberName(member)}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.publicUserData?.identifier ?? "No email"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === "org:admin" ? "secondary" : "outline"}>
                        {member.roleName || formatRole(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(member.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              Invites that have been sent but not accepted.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <EmptyMembersState label="No pending invitations." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{invitation.emailAddress}</p>
                        <p className="text-xs text-muted-foreground">{invitation.status}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={invitation.role === "org:admin" ? "secondary" : "outline"}>
                        {invitation.roleName || formatRole(invitation.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        disabled={revokingInvitationId !== null}
                        onClick={() => void revokeInvitation(invitation)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <RotateCcwIcon className={revokingInvitationId === invitation.id ? "animate-spin" : undefined} />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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

function formatRole(role: string): string {
  return role === "org:admin" ? "Admin" : "Member";
}
