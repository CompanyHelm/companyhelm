/**
 * @generated SignedSource<<ce4be18ba830fa1c6e1762b3ee50f459>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyMemberRole = "admin" | "member" | "%future added value";
export type CompanyMemberStatus = "active" | "invited" | "%future added value";
export type CompanySubscriptionPlan = "free" | "plus" | "pro" | "%future added value";
export type userDetailPageQuery$variables = {
  userId: string;
};
export type userDetailPageQuery$data = {
  readonly PlatformAdminUser: {
    readonly clerkUserId: string | null | undefined;
    readonly companyMemberships: ReadonlyArray<{
      readonly companyId: string;
      readonly companyName: string;
      readonly companyPlan: CompanySubscriptionPlan;
      readonly companySlug: string | null | undefined;
      readonly createdAt: string;
      readonly role: CompanyMemberRole;
      readonly status: CompanyMemberStatus;
      readonly updatedAt: string;
    }>;
    readonly createdAt: string;
    readonly email: string;
    readonly firstName: string;
    readonly id: string;
    readonly isPlatformAdmin: boolean;
    readonly lastName: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type userDetailPageQuery = {
  response: userDetailPageQuery$data;
  variables: userDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "userId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "userId"
      }
    ],
    "concreteType": "PlatformAdminUserDetail",
    "kind": "LinkedField",
    "name": "PlatformAdminUser",
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
        "name": "clerkUserId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "email",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "firstName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isPlatformAdmin",
        "storageKey": null
      },
      (v1/*: any*/),
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "PlatformAdminUserCompanyMembership",
        "kind": "LinkedField",
        "name": "companyMemberships",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "companyId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "companyName",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "companySlug",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "companyPlan",
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
          (v1/*: any*/),
          (v2/*: any*/)
        ],
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
    "name": "userDetailPageQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "userDetailPageQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "5d7a6499e1a4a9bb1c39bb0e2046f679",
    "id": null,
    "metadata": {},
    "name": "userDetailPageQuery",
    "operationKind": "query",
    "text": "query userDetailPageQuery(\n  $userId: ID!\n) {\n  PlatformAdminUser(id: $userId) {\n    id\n    clerkUserId\n    email\n    firstName\n    lastName\n    isPlatformAdmin\n    createdAt\n    updatedAt\n    companyMemberships {\n      companyId\n      companyName\n      companySlug\n      companyPlan\n      role\n      status\n      createdAt\n      updatedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "34ee917233248b81ed85725ddc79eeda";

export default node;
