/**
 * @generated SignedSource<<73d41821d1b9ea83826d1bc089c20dcd>>
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
    "cacheID": "fc991113b9aa6f471cd1b4a890f7e676",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelInviteMutation",
    "operationKind": "mutation",
    "text": "mutation organizationMembersSettingsPanelInviteMutation(\n  $input: InviteCompanyMemberInput!\n) {\n  InviteCompanyMember(input: $input) {\n    id\n    createdAt\n    emailAddress\n    role\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "0e3ac09609139cc24d6df76b4e5d9cfa";

export default node;
