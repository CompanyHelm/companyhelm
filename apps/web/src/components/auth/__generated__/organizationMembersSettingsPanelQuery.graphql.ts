/**
 * @generated SignedSource<<69edc2826e10d3fd7007c3502436fb16>>
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
    readonly userId: string;
  }>;
  readonly Me: {
    readonly companyEntitlements: {
      readonly canInviteMembers: boolean;
      readonly canManageMemberRoles: boolean;
    };
    readonly user: {
      readonly id: string;
    };
  };
};
export type organizationMembersSettingsPanelQuery = {
  response: organizationMembersSettingsPanelQuery$data;
  variables: organizationMembersSettingsPanelQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = [
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
        "concreteType": "MeUser",
        "kind": "LinkedField",
        "name": "user",
        "plural": false,
        "selections": [
          (v0/*: any*/)
        ],
        "storageKey": null
      },
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
      (v0/*: any*/),
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "organizationMembersSettingsPanelQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "organizationMembersSettingsPanelQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c763c1a5d454c6aa588575975fd84ad3",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelQuery",
    "operationKind": "query",
    "text": "query organizationMembersSettingsPanelQuery {\n  Me {\n    user {\n      id\n    }\n    companyEntitlements {\n      canInviteMembers\n      canManageMemberRoles\n    }\n  }\n  CompanyMembers {\n    id\n    createdAt\n    emailAddress\n    name\n    role\n    status\n    updatedAt\n    userId\n  }\n}\n"
  }
};
})();

(node as any).hash = "2596e08b6116a05f6ce3c6e4baddea3c";

export default node;
