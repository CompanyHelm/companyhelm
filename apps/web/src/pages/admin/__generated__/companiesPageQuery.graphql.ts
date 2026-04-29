/**
 * @generated SignedSource<<6a463e4c305bb392ec35ed47eabbcb28>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
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
      readonly enhancedLogging: {
        readonly components: ReadonlyArray<string>;
        readonly enabled: boolean;
        readonly expiresAt: string | null | undefined;
        readonly sessionIds: ReadonlyArray<string>;
        readonly ttlSeconds: number | null | undefined;
      };
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
            "concreteType": "PlatformAdminCompanyEnhancedLogging",
            "kind": "LinkedField",
            "name": "enhancedLogging",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "enabled",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "expiresAt",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "ttlSeconds",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "components",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "sessionIds",
                "storageKey": null
              }
            ],
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
    "cacheID": "e968af42c7671686113ffdf899830bb6",
    "id": null,
    "metadata": {},
    "name": "companiesPageQuery",
    "operationKind": "query",
    "text": "query companiesPageQuery(\n  $page: Int!\n  $pageSize: Int!\n  $search: String\n) {\n  PlatformAdminCompanies(page: $page, pageSize: $pageSize, search: $search) {\n    page\n    pageSize\n    totalCount\n    totalPages\n    nodes {\n      id\n      name\n      slug\n      plan\n      clerkOrganizationId\n      memberCount\n      enhancedLogging {\n        enabled\n        expiresAt\n        ttlSeconds\n        components\n        sessionIds\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "5a08fbc4dd3f54be5de83ab506a04029";

export default node;
