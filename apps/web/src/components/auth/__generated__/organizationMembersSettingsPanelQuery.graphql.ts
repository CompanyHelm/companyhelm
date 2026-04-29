/**
 * @generated SignedSource<<c075fc1d986b14f1a4db78b112745e88>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyMemberRole = "admin" | "member" | "%future added value";
export type CompanyMemberStatus = "active" | "invited" | "%future added value";
export type organizationMembersSettingsPanelQuery$variables = Record<PropertyKey, never>;
export type organizationMembersSettingsPanelQuery$data = {
  readonly CompanyMembers: ReadonlyArray<{
    readonly createdAt: string;
    readonly emailAddress: string;
    readonly id: string;
    readonly name: string;
    readonly role: CompanyMemberRole;
    readonly status: CompanyMemberStatus;
    readonly updatedAt: string;
  }>;
  readonly Me: {
    readonly companyEntitlements: {
      readonly canInviteMembers: boolean;
      readonly canManageMemberRoles: boolean;
    };
  };
};
export type organizationMembersSettingsPanelQuery = {
  response: organizationMembersSettingsPanelQuery$data;
  variables: organizationMembersSettingsPanelQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Me",
    "kind": "LinkedField",
    "name": "Me",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "MeCompanyEntitlements",
        "kind": "LinkedField",
        "name": "companyEntitlements",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "canInviteMembers",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "canManageMemberRoles",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "CompanyMemberAccess",
    "kind": "LinkedField",
    "name": "CompanyMembers",
    "plural": true,
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "organizationMembersSettingsPanelQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "organizationMembersSettingsPanelQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "df49a79ec4910af64ce61fd05898d287",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelQuery",
    "operationKind": "query",
    "text": "query organizationMembersSettingsPanelQuery {\n  Me {\n    companyEntitlements {\n      canInviteMembers\n      canManageMemberRoles\n    }\n  }\n  CompanyMembers {\n    id\n    createdAt\n    emailAddress\n    name\n    role\n    status\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "5a03f780a8fd448729777b014f137e7c";

export default node;
