/**
 * @generated SignedSource<<a0d91bd184692a4968b0da6b47d96c17>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type usersPageQuery$variables = {
  page: number;
  pageSize: number;
  search?: string | null | undefined;
};
export type usersPageQuery$data = {
  readonly PlatformAdminUsers: {
    readonly nodes: ReadonlyArray<{
      readonly clerkUserId: string | null | undefined;
      readonly companyCount: number;
      readonly createdAt: string;
      readonly email: string;
      readonly firstName: string;
      readonly id: string;
      readonly isPlatformAdmin: boolean;
      readonly lastName: string | null | undefined;
      readonly updatedAt: string;
    }>;
    readonly page: number;
    readonly pageSize: number;
    readonly totalCount: number;
    readonly totalPages: number;
  };
};
export type usersPageQuery = {
  response: usersPageQuery$data;
  variables: usersPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "page"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "pageSize"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "search"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "page",
        "variableName": "page"
      },
      {
        "kind": "Variable",
        "name": "pageSize",
        "variableName": "pageSize"
      },
      {
        "kind": "Variable",
        "name": "search",
        "variableName": "search"
      }
    ],
    "concreteType": "PlatformAdminUserPage",
    "kind": "LinkedField",
    "name": "PlatformAdminUsers",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "page",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pageSize",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "totalPages",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PlatformAdminUser",
        "kind": "LinkedField",
        "name": "nodes",
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
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "companyCount",
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
            "name": "updatedAt",
            "storageKey": null
          }
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
    "name": "usersPageQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "usersPageQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "16cf464fd405dbd2c6e1ea2c6da5a606",
    "id": null,
    "metadata": {},
    "name": "usersPageQuery",
    "operationKind": "query",
    "text": "query usersPageQuery(\n  $page: Int!\n  $pageSize: Int!\n  $search: String\n) {\n  PlatformAdminUsers(page: $page, pageSize: $pageSize, search: $search) {\n    page\n    pageSize\n    totalCount\n    totalPages\n    nodes {\n      id\n      clerkUserId\n      email\n      firstName\n      lastName\n      isPlatformAdmin\n      companyCount\n      createdAt\n      updatedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "a867c68d41d0a6f98c328755c6552b08";

export default node;
