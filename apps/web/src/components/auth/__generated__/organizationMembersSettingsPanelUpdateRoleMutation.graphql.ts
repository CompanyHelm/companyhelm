/**
 * @generated SignedSource<<ae7cd39ba5cd39e9d849eea84488ff18>>
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
    readonly userId: string;
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
    "cacheID": "7f5f456da8e43ff7b3cbe3b326251735",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelUpdateRoleMutation",
    "operationKind": "mutation",
    "text": "mutation organizationMembersSettingsPanelUpdateRoleMutation(\n  $input: UpdateCompanyMemberRoleInput!\n) {\n  UpdateCompanyMemberRole(input: $input) {\n    id\n    createdAt\n    emailAddress\n    name\n    role\n    status\n    updatedAt\n    userId\n  }\n}\n"
  }
};
})();

(node as any).hash = "aace93c14d227b3c8adc98496c483e1c";

export default node;
