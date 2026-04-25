/**
 * @generated SignedSource<<85635c3ce7f2d9ee677a012d5dc07bd1>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyDeletionStatus = "active" | "deletion_requested" | "%future added value";
export type CompanySubscriptionPlan = "free" | "pro" | "%future added value";
export type companiesPageQuery$variables = {
  page: number;
  pageSize: number;
  search?: string | null | undefined;
};
export type companiesPageQuery$data = {
  readonly PlatformAdminCompanies: {
    readonly nodes: ReadonlyArray<{
      readonly clerkOrganizationId: string | null | undefined;
      readonly deletionRequestedAt: string | null | undefined;
      readonly deletionStatus: CompanyDeletionStatus;
      readonly id: string;
      readonly memberCount: number;
      readonly name: string;
      readonly plan: CompanySubscriptionPlan;
      readonly slug: string | null | undefined;
    }>;
    readonly page: number;
    readonly pageSize: number;
    readonly totalCount: number;
    readonly totalPages: number;
  };
};
export type companiesPageQuery = {
  response: companiesPageQuery$data;
  variables: companiesPageQuery$variables;
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
    "concreteType": "PlatformAdminCompanyPage",
    "kind": "LinkedField",
    "name": "PlatformAdminCompanies",
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
        "concreteType": "PlatformAdminCompany",
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
            "name": "name",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "slug",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "plan",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "deletionStatus",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "clerkOrganizationId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "memberCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "deletionRequestedAt",
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
    "name": "companiesPageQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "companiesPageQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "35a209a193da2a657eddaf8533bdbe0b",
    "id": null,
    "metadata": {},
    "name": "companiesPageQuery",
    "operationKind": "query",
    "text": "query companiesPageQuery(\n  $page: Int!\n  $pageSize: Int!\n  $search: String\n) {\n  PlatformAdminCompanies(page: $page, pageSize: $pageSize, search: $search) {\n    page\n    pageSize\n    totalCount\n    totalPages\n    nodes {\n      id\n      name\n      slug\n      plan\n      deletionStatus\n      clerkOrganizationId\n      memberCount\n      deletionRequestedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "146032959ac876385d17241e07f4eb59";

export default node;
