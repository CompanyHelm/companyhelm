/**
 * @generated SignedSource<<b7f2c8c0e5bd0b1a7fcc6fb5a5ceb2db>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyMemberRole = "admin" | "member" | "%future added value";
export type CompanyMemberStatus = "active" | "invited" | "%future added value";
export type InviteCompanyMemberInput = {
  emailAddress: string;
  role: CompanyMemberRole;
};
export type organizationMembersSettingsPanelInviteMutation$variables = {
  input: InviteCompanyMemberInput;
};
export type organizationMembersSettingsPanelInviteMutation$data = {
  readonly InviteCompanyMember: {
    readonly createdAt: string;
    readonly emailAddress: string;
    readonly id: string;
    readonly role: CompanyMemberRole;
    readonly status: CompanyMemberStatus;
    readonly userId: string;
  };
};
export type organizationMembersSettingsPanelInviteMutation = {
  response: organizationMembersSettingsPanelInviteMutation$data;
  variables: organizationMembersSettingsPanelInviteMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "CompanyMemberInvitation",
    "kind": "LinkedField",
    "name": "InviteCompanyMember",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "emailAddress",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "role",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "userId",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "organizationMembersSettingsPanelInviteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "organizationMembersSettingsPanelInviteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "cc645bc3d4737a5bcb5d5e7d76fe981a",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelInviteMutation",
    "operationKind": "mutation",
    "text": "mutation organizationMembersSettingsPanelInviteMutation(\n  $input: InviteCompanyMemberInput!\n) {\n  InviteCompanyMember(input: $input) {\n    id\n    createdAt\n    emailAddress\n    role\n    status\n    userId\n  }\n}\n"
  }
};
})();

(node as any).hash = "e1ae826643a47bc56042592b2c60e7f0";

export default node;
