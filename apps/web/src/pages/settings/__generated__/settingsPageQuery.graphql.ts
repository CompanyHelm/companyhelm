/**
 * @generated SignedSource<<002eb0256fd073d2a1d7351f45b2c7c3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "plus" | "pro" | "%future added value";
export type settingsPageQuery$variables = Record<PropertyKey, never>;
export type settingsPageQuery$data = {
  readonly BillingPlans: ReadonlyArray<{
    readonly currencyCode: string;
    readonly description: string;
    readonly key: CompanySubscriptionPlan;
    readonly monthlyCreditsNanoUsd: number;
    readonly name: string;
    readonly paddlePriceId: string | null | undefined;
    readonly priceCents: number;
  }>;
  readonly CompanySettings: {
    readonly baseSystemPrompt: string | null | undefined;
    readonly companyId: string;
  };
  readonly CompanyWallet: {
    readonly currentPlan: CompanySubscriptionPlan;
    readonly nextRechargeAt: string;
    readonly pendingPlan: CompanySubscriptionPlan | null | undefined;
    readonly pendingPlanEffectiveAt: string | null | undefined;
    readonly wallets: ReadonlyArray<{
      readonly amountNanoUsd: number;
      readonly type: string;
    }>;
  };
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
    };
    readonly companyEntitlements: {
      readonly canDeleteCompany: boolean;
    };
  };
  readonly TaskStages: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly taskCount: number;
    readonly updatedAt: string;
  }>;
};
export type settingsPageQuery = {
  response: settingsPageQuery$data;
  variables: settingsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v2 = {
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
          "name": "canDeleteCompany",
          "storageKey": null
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "AuthenticatedCompany",
      "kind": "LinkedField",
      "name": "company",
      "plural": false,
      "selections": [
        (v0/*: any*/),
        (v1/*: any*/)
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "concreteType": "CompanySettings",
  "kind": "LinkedField",
  "name": "CompanySettings",
  "plural": false,
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
      "name": "baseSystemPrompt",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "concreteType": "TaskStage",
  "kind": "LinkedField",
  "name": "TaskStages",
  "plural": true,
  "selections": [
    (v0/*: any*/),
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isDefault",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "taskCount",
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
},
v5 = {
  "alias": null,
  "args": null,
  "concreteType": "BillingPlan",
  "kind": "LinkedField",
  "name": "BillingPlans",
  "plural": true,
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "key",
      "storageKey": null
    },
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "description",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "priceCents",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "currencyCode",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "paddlePriceId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "monthlyCreditsNanoUsd",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "currentPlan",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "pendingPlan",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "pendingPlanEffectiveAt",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "nextRechargeAt",
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "type",
  "storageKey": null
},
v11 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "amountNanoUsd",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "settingsPageQuery",
    "selections": [
      (v2/*: any*/),
      (v3/*: any*/),
      (v4/*: any*/),
      (v5/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "CompanyWallet",
        "kind": "LinkedField",
        "name": "CompanyWallet",
        "plural": false,
        "selections": [
          (v6/*: any*/),
          (v7/*: any*/),
          (v8/*: any*/),
          (v9/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Wallet",
            "kind": "LinkedField",
            "name": "wallets",
            "plural": true,
            "selections": [
              (v10/*: any*/),
              (v11/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "settingsPageQuery",
    "selections": [
      (v2/*: any*/),
      (v3/*: any*/),
      (v4/*: any*/),
      (v5/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "CompanyWallet",
        "kind": "LinkedField",
        "name": "CompanyWallet",
        "plural": false,
        "selections": [
          (v6/*: any*/),
          (v7/*: any*/),
          (v8/*: any*/),
          (v9/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Wallet",
            "kind": "LinkedField",
            "name": "wallets",
            "plural": true,
            "selections": [
              (v10/*: any*/),
              (v11/*: any*/),
              (v0/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "4a9ed53944d58e4468e6cb2bd2aa8b07",
    "id": null,
    "metadata": {},
    "name": "settingsPageQuery",
    "operationKind": "query",
    "text": "query settingsPageQuery {\n  Me {\n    companyEntitlements {\n      canDeleteCompany\n    }\n    company {\n      id\n      name\n    }\n  }\n  CompanySettings {\n    companyId\n    baseSystemPrompt\n  }\n  TaskStages {\n    id\n    name\n    isDefault\n    taskCount\n    createdAt\n    updatedAt\n  }\n  BillingPlans {\n    key\n    name\n    description\n    priceCents\n    currencyCode\n    paddlePriceId\n    monthlyCreditsNanoUsd\n  }\n  CompanyWallet {\n    currentPlan\n    pendingPlan\n    pendingPlanEffectiveAt\n    nextRechargeAt\n    wallets {\n      type\n      amountNanoUsd\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "09f442ff2869eb5e207de4f496c49695";

export default node;
