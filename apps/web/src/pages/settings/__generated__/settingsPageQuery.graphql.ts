/**
 * @generated SignedSource<<bf281687d1e52c82a293a3dce20e309f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "pro" | "%future added value";
export type settingsPageQuery$variables = Record<PropertyKey, never>;
export type settingsPageQuery$data = {
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
  "kind": "ScalarField",
  "name": "currentPlan",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "pendingPlan",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "pendingPlanEffectiveAt",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "nextRechargeAt",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "type",
  "storageKey": null
},
v10 = {
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
      {
        "alias": null,
        "args": null,
        "concreteType": "CompanyWallet",
        "kind": "LinkedField",
        "name": "CompanyWallet",
        "plural": false,
        "selections": [
          (v5/*: any*/),
          (v6/*: any*/),
          (v7/*: any*/),
          (v8/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Wallet",
            "kind": "LinkedField",
            "name": "wallets",
            "plural": true,
            "selections": [
              (v9/*: any*/),
              (v10/*: any*/)
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
      {
        "alias": null,
        "args": null,
        "concreteType": "CompanyWallet",
        "kind": "LinkedField",
        "name": "CompanyWallet",
        "plural": false,
        "selections": [
          (v5/*: any*/),
          (v6/*: any*/),
          (v7/*: any*/),
          (v8/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Wallet",
            "kind": "LinkedField",
            "name": "wallets",
            "plural": true,
            "selections": [
              (v9/*: any*/),
              (v10/*: any*/),
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
    "cacheID": "66daf285e701a485495c7f32f9d8a7b2",
    "id": null,
    "metadata": {},
    "name": "settingsPageQuery",
    "operationKind": "query",
    "text": "query settingsPageQuery {\n  Me {\n    companyEntitlements {\n      canDeleteCompany\n    }\n    company {\n      id\n      name\n    }\n  }\n  CompanySettings {\n    companyId\n    baseSystemPrompt\n  }\n  TaskStages {\n    id\n    name\n    isDefault\n    taskCount\n    createdAt\n    updatedAt\n  }\n  CompanyWallet {\n    currentPlan\n    pendingPlan\n    pendingPlanEffectiveAt\n    nextRechargeAt\n    wallets {\n      type\n      amountNanoUsd\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "a8e452a83bdc222d71129933e55141de";

export default node;
