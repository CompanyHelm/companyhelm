/**
 * @generated SignedSource<<9dddb58cf06c8041487334b1f5c15160>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "plus" | "pro" | "%future added value";
export type companyDetailPageQuery$variables = {
  companyId: string;
};
export type companyDetailPageQuery$data = {
  readonly PlatformAdminCompany: {
    readonly clerkOrganizationId: string | null | undefined;
    readonly id: string;
    readonly memberCount: number;
    readonly name: string;
    readonly plan: CompanySubscriptionPlan;
    readonly slug: string | null | undefined;
    readonly usage: {
      readonly cacheReadTokens: number;
      readonly cacheWriteTokens: number;
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly requestCount: number;
      readonly totalCostNanoUsd: number;
      readonly totalCostNanoVirtualUsd: number;
      readonly totalTokens: number;
    };
    readonly wallets: ReadonlyArray<{
      readonly amountNanoUsd: number;
      readonly companyId: string;
      readonly id: string;
      readonly transactionCount: number;
      readonly type: string;
      readonly updatedAt: string;
    }>;
  };
};
export type companyDetailPageQuery = {
  response: companyDetailPageQuery$data;
  variables: companyDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "companyId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "companyId"
      }
    ],
    "concreteType": "PlatformAdminCompanyDetail",
    "kind": "LinkedField",
    "name": "PlatformAdminCompany",
    "plural": false,
    "selections": [
      (v1/*: any*/),
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
        "concreteType": "PlatformAdminCompanyUsage",
        "kind": "LinkedField",
        "name": "usage",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "requestCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "inputTokens",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "outputTokens",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "cacheReadTokens",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "cacheWriteTokens",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "totalTokens",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "totalCostNanoUsd",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "totalCostNanoVirtualUsd",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PlatformAdminCompanyWallet",
        "kind": "LinkedField",
        "name": "wallets",
        "plural": true,
        "selections": [
          (v1/*: any*/),
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
            "name": "type",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "amountNanoUsd",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "transactionCount",
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
    "name": "companyDetailPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "companyDetailPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "ae9d22596f579088e2c6edb1d16c8e0d",
    "id": null,
    "metadata": {},
    "name": "companyDetailPageQuery",
    "operationKind": "query",
    "text": "query companyDetailPageQuery(\n  $companyId: ID!\n) {\n  PlatformAdminCompany(id: $companyId) {\n    id\n    name\n    slug\n    plan\n    clerkOrganizationId\n    memberCount\n    usage {\n      requestCount\n      inputTokens\n      outputTokens\n      cacheReadTokens\n      cacheWriteTokens\n      totalTokens\n      totalCostNanoUsd\n      totalCostNanoVirtualUsd\n    }\n    wallets {\n      id\n      companyId\n      type\n      amountNanoUsd\n      transactionCount\n      updatedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "dee18879b35f51800f3b36205618334d";

export default node;
