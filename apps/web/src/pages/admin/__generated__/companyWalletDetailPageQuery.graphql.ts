/**
 * @generated SignedSource<<6da67649779b39d181803802bd917574>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "plus" | "pro" | "%future added value";
export type companyWalletDetailPageQuery$variables = {
  companyId: string;
  walletId: string;
};
export type companyWalletDetailPageQuery$data = {
  readonly PlatformAdminCompanyWallet: {
    readonly company: {
      readonly id: string;
      readonly name: string;
      readonly plan: CompanySubscriptionPlan;
      readonly slug: string | null | undefined;
    };
    readonly transactions: ReadonlyArray<{
      readonly amountNanoUsd: number;
      readonly category: string;
      readonly companyId: string;
      readonly createdAt: string;
      readonly id: string;
      readonly periodEnd: string | null | undefined;
      readonly periodStart: string | null | undefined;
      readonly sessionId: string | null | undefined;
      readonly sessionTurnId: string | null | undefined;
      readonly walletId: string;
    }>;
    readonly wallet: {
      readonly amountNanoUsd: number;
      readonly companyId: string;
      readonly createdAt: string;
      readonly id: string;
      readonly transactionCount: number;
      readonly type: string;
      readonly updatedAt: string;
    };
  };
};
export type companyWalletDetailPageQuery = {
  response: companyWalletDetailPageQuery$data;
  variables: companyWalletDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "companyId"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "walletId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "companyId",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "amountNanoUsd",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v5 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "companyId",
        "variableName": "companyId"
      },
      {
        "kind": "Variable",
        "name": "walletId",
        "variableName": "walletId"
      }
    ],
    "concreteType": "PlatformAdminCompanyWalletDetail",
    "kind": "LinkedField",
    "name": "PlatformAdminCompanyWallet",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "PlatformAdminCompanyWalletCompany",
        "kind": "LinkedField",
        "name": "company",
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
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PlatformAdminCompanyWallet",
        "kind": "LinkedField",
        "name": "wallet",
        "plural": false,
        "selections": [
          (v1/*: any*/),
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "type",
            "storageKey": null
          },
          (v3/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "transactionCount",
            "storageKey": null
          },
          (v4/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "updatedAt",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PlatformAdminWalletTransaction",
        "kind": "LinkedField",
        "name": "transactions",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "walletId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "category",
            "storageKey": null
          },
          (v3/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "periodStart",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "periodEnd",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "sessionId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "sessionTurnId",
            "storageKey": null
          },
          (v4/*: any*/)
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
    "name": "companyWalletDetailPageQuery",
    "selections": (v5/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "companyWalletDetailPageQuery",
    "selections": (v5/*: any*/)
  },
  "params": {
    "cacheID": "32bb53c9a54c635f11666f31d070139d",
    "id": null,
    "metadata": {},
    "name": "companyWalletDetailPageQuery",
    "operationKind": "query",
    "text": "query companyWalletDetailPageQuery(\n  $companyId: ID!\n  $walletId: ID!\n) {\n  PlatformAdminCompanyWallet(companyId: $companyId, walletId: $walletId) {\n    company {\n      id\n      name\n      slug\n      plan\n    }\n    wallet {\n      id\n      companyId\n      type\n      amountNanoUsd\n      transactionCount\n      createdAt\n      updatedAt\n    }\n    transactions {\n      id\n      companyId\n      walletId\n      category\n      amountNanoUsd\n      periodStart\n      periodEnd\n      sessionId\n      sessionTurnId\n      createdAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "7304bb4e2a292e3537b27252d9c04569";

export default node;
