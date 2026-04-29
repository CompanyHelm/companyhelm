/**
 * @generated SignedSource<<3c4450588c956764710ef4786cc8f9f3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyMemberRole = "admin" | "member" | "%future added value";
export type CompanyMemberStatus = "active" | "invited" | "%future added value";
export type UpdateCompanyMemberRoleInput = {
  role: CompanyMemberRole;
  userId: string;
};
export type organizationMembersSettingsPanelUpdateRoleMutation$variables = {
  input: UpdateCompanyMemberRoleInput;
};
export type organizationMembersSettingsPanelUpdateRoleMutation$data = {
  readonly UpdateCompanyMemberRole: {
    readonly createdAt: string;
    readonly emailAddress: string;
    readonly id: string;
    readonly name: string;
    readonly role: CompanyMemberRole;
    readonly status: CompanyMemberStatus;
    readonly updatedAt: string;
  };
};
export type organizationMembersSettingsPanelUpdateRoleMutation = {
  response: organizationMembersSettingsPanelUpdateRoleMutation$data;
  variables: organizationMembersSettingsPanelUpdateRoleMutation$variables;
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
    "concreteType": "CompanyMemberAccess",
    "kind": "LinkedField",
    "name": "UpdateCompanyMemberRole",
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
        "name": "name",
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
        "name": "updatedAt",
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
    "name": "organizationMembersSettingsPanelUpdateRoleMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "organizationMembersSettingsPanelUpdateRoleMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e20c4145132125c6ff23dca19417c736",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelUpdateRoleMutation",
    "operationKind": "mutation",
    "text": "mutation organizationMembersSettingsPanelUpdateRoleMutation(\n  $input: UpdateCompanyMemberRoleInput!\n) {\n  UpdateCompanyMemberRole(input: $input) {\n    id\n    createdAt\n    emailAddress\n    name\n    role\n    status\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "f05b368bfcce55d60139f392d6a06086";

export default node;
