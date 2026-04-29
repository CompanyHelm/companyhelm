import { FormEvent, useState } from "react";
import { MailPlusIcon, RotateCcwIcon, UsersIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
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
import type { organizationMembersSettingsPanelInviteMutation } from "./__generated__/organizationMembersSettingsPanelInviteMutation.graphql";
import type { organizationMembersSettingsPanelQuery } from "./__generated__/organizationMembersSettingsPanelQuery.graphql";
import type { organizationMembersSettingsPanelRevokeMutation } from "./__generated__/organizationMembersSettingsPanelRevokeMutation.graphql";
import type { organizationMembersSettingsPanelUpdateRoleMutation } from "./__generated__/organizationMembersSettingsPanelUpdateRoleMutation.graphql";

type CompanyMemberRole = "admin" | "member";
type CompanyMemberStatus = "active" | "invited";

type OrganizationMemberTableRecord = {
  createdAt: string;
  emailAddress: string;
  id: string;
  name: string;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  updatedAt: string;
};

const organizationMembersSettingsPanelQueryNode = graphql`
  query organizationMembersSettingsPanelQuery {
    Me {
      user {
        id
      }
      companyEntitlements {
        canInviteMembers
        canManageMemberRoles
      }
    }
    CompanyMembers {
      id
      createdAt
      emailAddress
      name
      role
      status
      updatedAt
    }
  }
`;

const organizationMembersSettingsPanelInviteMutationNode = graphql`
  mutation organizationMembersSettingsPanelInviteMutation($input: InviteCompanyMemberInput!) {
    InviteCompanyMember(input: $input) {
      id
      createdAt
      emailAddress
      role
      status
    }
  }
`;

const organizationMembersSettingsPanelRevokeMutationNode = graphql`
  mutation organizationMembersSettingsPanelRevokeMutation($input: RevokeCompanyMemberInvitationInput!) {
    RevokeCompanyMemberInvitation(input: $input) {
      id
    }
  }
`;

const organizationMembersSettingsPanelUpdateRoleMutationNode = graphql`
  mutation organizationMembersSettingsPanelUpdateRoleMutation($input: UpdateCompanyMemberRoleInput!) {
    UpdateCompanyMemberRole(input: $input) {
      id
      createdAt
      emailAddress
      name
      role
      status
      updatedAt
    }
  }
`;

/**
 * Hosts CompanyHelm's member management surface using the API-backed company_members table as the
 * source of truth while Clerk remains only the outbound invitation transport.
 */
export function OrganizationMembersSettingsPanel() {
  const data = useLazyLoadQuery<organizationMembersSettingsPanelQuery>(
    organizationMembersSettingsPanelQueryNode,
    {},
    {
      fetchPolicy: "network-only",
    },
  );
  const [emailAddress, setEmailAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<CompanyMemberRole>("member");
  const [isInviting, setInviting] = useState(false);
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [members, setMembers] = useState<OrganizationMemberTableRecord[]>(() =>
    data.CompanyMembers.map((member) => ({
      createdAt: member.createdAt,
      emailAddress: member.emailAddress,
      id: member.id,
      name: member.name,
      role: coerceRole(member.role),
      status: coerceStatus(member.status),
      updatedAt: member.updatedAt,
    })));
  const [revokingMemberId, setRevokingMemberId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState<string | null>(null);
  const [commitInviteMember] = useMutation<organizationMembersSettingsPanelInviteMutation>(
    organizationMembersSettingsPanelInviteMutationNode,
  );
  const [commitRevokeInvitation] = useMutation<organizationMembersSettingsPanelRevokeMutation>(
    organizationMembersSettingsPanelRevokeMutationNode,
  );
  const [commitUpdateRole] = useMutation<organizationMembersSettingsPanelUpdateRoleMutation>(
    organizationMembersSettingsPanelUpdateRoleMutationNode,
  );
  const canInviteMembers = data.Me.companyEntitlements.canInviteMembers;
  const canManageMemberRoles = data.Me.companyEntitlements.canManageMemberRoles;
  const currentUserId = data.Me.user.id;

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isInviting) {
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
      const invitedMember = await new Promise<OrganizationMemberTableRecord>((resolve, reject) => {
        commitInviteMember({
          variables: {
            input: {
              emailAddress,
              role: inviteRole,
            },
          },
          onCompleted: (response, errors) => {
            const nextErrorMessage = errors?.[0]?.message;
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve({
              createdAt: response.InviteCompanyMember.createdAt,
              emailAddress: response.InviteCompanyMember.emailAddress,
              id: response.InviteCompanyMember.id,
              name: response.InviteCompanyMember.emailAddress,
              role: coerceRole(response.InviteCompanyMember.role),
              status: coerceStatus(response.InviteCompanyMember.status),
              updatedAt: response.InviteCompanyMember.createdAt,
            });
          },
          onError: reject,
        });
      });
      setMembers((currentMembers) => upsertMember(currentMembers, invitedMember));
      setEmailAddress("");
      setInviteDialogOpen(false);
      setInviteRole("member");
      setSuccessMessage(`Invitation sent to ${emailAddress}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvitation(member: OrganizationMemberTableRecord) {
    if (revokingMemberId) {
      return;
    }

    setRevokingMemberId(member.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitRevokeInvitation({
        variables: {
          input: {
            userId: member.id,
          },
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = errors?.[0]?.message;
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    }).then(() => {
      setMembers((currentMembers) => currentMembers.filter((currentMember) => currentMember.id !== member.id));
      setSuccessMessage(`Invitation revoked for ${member.emailAddress}.`);
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to revoke invitation.");
    }).finally(() => {
      setRevokingMemberId(null);
    });
  }

  async function updateRole(member: OrganizationMemberTableRecord, role: CompanyMemberRole) {
    if (updatingRoleMemberId || member.role === role) {
      return;
    }

    setUpdatingRoleMemberId(member.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    await new Promise<OrganizationMemberTableRecord>((resolve, reject) => {
      commitUpdateRole({
        variables: {
          input: {
            role,
            userId: member.id,
          },
        },
        onCompleted: (response, errors) => {
          const nextErrorMessage = errors?.[0]?.message;
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve({
            createdAt: response.UpdateCompanyMemberRole.createdAt,
            emailAddress: response.UpdateCompanyMemberRole.emailAddress,
            id: response.UpdateCompanyMemberRole.id,
            name: response.UpdateCompanyMemberRole.name,
            role: coerceRole(response.UpdateCompanyMemberRole.role),
            status: coerceStatus(response.UpdateCompanyMemberRole.status),
            updatedAt: response.UpdateCompanyMemberRole.updatedAt,
          });
        },
        onError: reject,
      });
    }).then((updatedMember) => {
      setMembers((currentMembers) => upsertMember(currentMembers, updatedMember));
      setSuccessMessage(`Updated ${updatedMember.emailAddress}.`);
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update member role.");
    }).finally(() => {
      setUpdatingRoleMemberId(null);
    });
  }

  return (
    <div className="grid gap-4">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Invite teammates and review CompanyHelm access.
            </CardDescription>
          </div>
          <CardAction>
            <Button disabled={!canInviteMembers} onClick={() => setInviteDialogOpen(true)} size="sm" type="button">
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

          {members.length === 0 ? (
            <EmptyMembersState label="No members or invitations found." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={`${member.status}:${member.id}`}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{member.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.emailAddress}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "positive" : "outline"}>
                        {member.status === "active" ? "Active" : "Invited"}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-40">
                      <Select
                        disabled={!canManageMemberRoles || updatingRoleMemberId !== null || member.id === currentUserId}
                        onValueChange={(value) => void updateRole(member, value as CompanyMemberRole)}
                        value={member.role}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{formatDate(member.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {member.status === "invited" && canInviteMembers ? (
                        <Button
                          disabled={revokingMemberId !== null}
                          onClick={() => void revokeInvitation(member)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <RotateCcwIcon className={revokingMemberId === member.id ? "animate-spin" : undefined} />
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
            setInviteRole("member");
          }
        }}
      >
        <DialogContent className="w-[min(92vw,30rem)]">
          <form className="grid gap-4" onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite member</DialogTitle>
              <DialogDescription>
                Send a company invitation and choose the member's CompanyHelm role.
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
            <Select
              disabled={isInviting}
              onValueChange={(value) => setInviteRole(value as CompanyMemberRole)}
              value={inviteRole}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function upsertMember(
  members: OrganizationMemberTableRecord[],
  member: OrganizationMemberTableRecord,
): OrganizationMemberTableRecord[] {
  const existingIndex = members.findIndex((currentMember) => currentMember.id === member.id);
  if (existingIndex === -1) {
    return [...members, member];
  }

  const nextMembers = [...members];
  nextMembers[existingIndex] = member;
  return nextMembers;
}

function coerceRole(value: string): CompanyMemberRole {
  return value === "admin" ? "admin" : "member";
}

function coerceStatus(value: string): CompanyMemberStatus {
  return value === "active" ? "active" : "invited";
}
