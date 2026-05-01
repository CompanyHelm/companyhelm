/**
 * @generated SignedSource<<f657ebcde56d9db401da9a59ee5d44b4>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "pro" | "%future added value";
export type LlmUsageAggregatePeriod = "day" | "month" | "total" | "%future added value";
export type LlmUsageAggregateScope = "agent" | "company" | "managed_model_provider_credential" | "model_provider_credential" | "session" | "%future added value";
export type usagePageQuery$variables = {
  dailyStart: string;
  monthlyStart: string;
};
export type usagePageQuery$data = {
  readonly CompanyWallet: {
    readonly currentPlan: CompanySubscriptionPlan;
    readonly nextRechargeAmountNanoUsd: number;
    readonly nextRechargeAt: string;
    readonly pendingPlan: CompanySubscriptionPlan | null | undefined;
    readonly pendingPlanEffectiveAt: string | null | undefined;
    readonly totalBalanceNanoUsd: number;
    readonly transactions: ReadonlyArray<{
      readonly amountNanoUsd: number;
      readonly category: string;
      readonly createdAt: string;
      readonly id: string;
    }>;
    readonly wallets: ReadonlyArray<{
      readonly amountNanoUsd: number;
      readonly id: string;
      readonly type: string;
    }>;
  };
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
    };
  };
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly status: string;
    readonly type: string;
  }>;
  readonly companyDaily: ReadonlyArray<{
    readonly agentId: string | null | undefined;
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadCostNanoVirtualUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteCostNanoVirtualUsd: number;
    readonly cacheWriteTokens: number;
    readonly companyId: string;
    readonly inputCostNanoUsd: number;
    readonly inputCostNanoVirtualUsd: number;
    readonly inputTokens: number;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly outputCostNanoUsd: number;
    readonly outputCostNanoVirtualUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeType: LlmUsageAggregateScope;
    readonly sessionId: string | null | undefined;
    readonly totalCostNanoUsd: number;
    readonly totalCostNanoVirtualUsd: number;
    readonly totalTokens: number;
  }>;
  readonly companyMonthly: ReadonlyArray<{
    readonly agentId: string | null | undefined;
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadCostNanoVirtualUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteCostNanoVirtualUsd: number;
    readonly cacheWriteTokens: number;
    readonly companyId: string;
    readonly inputCostNanoUsd: number;
    readonly inputCostNanoVirtualUsd: number;
    readonly inputTokens: number;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly outputCostNanoUsd: number;
    readonly outputCostNanoVirtualUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeType: LlmUsageAggregateScope;
    readonly sessionId: string | null | undefined;
    readonly totalCostNanoUsd: number;
    readonly totalCostNanoVirtualUsd: number;
    readonly totalTokens: number;
  }>;
  readonly companyTotal: ReadonlyArray<{
    readonly agentId: string | null | undefined;
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadCostNanoVirtualUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteCostNanoVirtualUsd: number;
    readonly cacheWriteTokens: number;
    readonly companyId: string;
    readonly inputCostNanoUsd: number;
    readonly inputCostNanoVirtualUsd: number;
    readonly inputTokens: number;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly outputCostNanoUsd: number;
    readonly outputCostNanoVirtualUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeType: LlmUsageAggregateScope;
    readonly sessionId: string | null | undefined;
    readonly totalCostNanoUsd: number;
    readonly totalCostNanoVirtualUsd: number;
    readonly totalTokens: number;
  }>;
  readonly providerTotals: ReadonlyArray<{
    readonly agentId: string | null | undefined;
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadCostNanoVirtualUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteCostNanoVirtualUsd: number;
    readonly cacheWriteTokens: number;
    readonly companyId: string;
    readonly inputCostNanoUsd: number;
    readonly inputCostNanoVirtualUsd: number;
    readonly inputTokens: number;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly outputCostNanoUsd: number;
    readonly outputCostNanoVirtualUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeType: LlmUsageAggregateScope;
    readonly sessionId: string | null | undefined;
    readonly totalCostNanoUsd: number;
    readonly totalCostNanoVirtualUsd: number;
    readonly totalTokens: number;
  }>;
};
export type usagePageQuery = {
  response: usagePageQuery$data;
  variables: usagePageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "dailyStart"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "monthlyStart"
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
  "name": "name",
  "storageKey": null
},
v3 = {
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
      "concreteType": "AuthenticatedCompany",
      "kind": "LinkedField",
      "name": "company",
      "plural": false,
      "selections": [
        (v1/*: any*/),
        (v2/*: any*/)
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "type",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "amountNanoUsd",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "concreteType": "CompanyWallet",
  "kind": "LinkedField",
  "name": "CompanyWallet",
  "plural": false,
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "currentPlan",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "pendingPlan",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "pendingPlanEffectiveAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "totalBalanceNanoUsd",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "nextRechargeAmountNanoUsd",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "nextRechargeAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "Wallet",
      "kind": "LinkedField",
      "name": "wallets",
      "plural": true,
      "selections": [
        (v1/*: any*/),
        (v4/*: any*/),
        (v5/*: any*/)
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "WalletTransaction",
      "kind": "LinkedField",
      "name": "transactions",
      "plural": true,
      "selections": [
        (v1/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "category",
          "storageKey": null
        },
        (v5/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "createdAt",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
},
v7 = [
  {
    "kind": "Literal",
    "name": "input",
    "value": {
      "period": "total",
      "scopeType": "company"
    }
  }
],
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoUsd",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoVirtualUsd",
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v11 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoVirtualUsd",
  "storageKey": null
},
v13 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v14 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoVirtualUsd",
  "storageKey": null
},
v16 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoVirtualUsd",
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputTokens",
  "storageKey": null
},
v20 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "period",
  "storageKey": null
},
v21 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "requestCount",
  "storageKey": null
},
v23 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "companyId",
  "storageKey": null
},
v24 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "agentId",
  "storageKey": null
},
v25 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialId",
  "storageKey": null
},
v26 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "sessionId",
  "storageKey": null
},
v27 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v28 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v29 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoVirtualUsd",
  "storageKey": null
},
v30 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v31 = [
  (v8/*: any*/),
  (v9/*: any*/),
  (v10/*: any*/),
  (v11/*: any*/),
  (v12/*: any*/),
  (v13/*: any*/),
  (v14/*: any*/),
  (v15/*: any*/),
  (v16/*: any*/),
  (v17/*: any*/),
  (v18/*: any*/),
  (v19/*: any*/),
  (v20/*: any*/),
  (v21/*: any*/),
  (v22/*: any*/),
  (v23/*: any*/),
  (v24/*: any*/),
  (v25/*: any*/),
  (v26/*: any*/),
  (v27/*: any*/),
  (v28/*: any*/),
  (v29/*: any*/),
  (v30/*: any*/)
],
v32 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "company"
},
v33 = [
  {
    "fields": [
      {
        "kind": "Literal",
        "name": "period",
        "value": "day"
      },
      {
        "kind": "Variable",
        "name": "periodStartAfter",
        "variableName": "dailyStart"
      },
      (v32/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v34 = [
  {
    "fields": [
      {
        "kind": "Literal",
        "name": "period",
        "value": "month"
      },
      {
        "kind": "Variable",
        "name": "periodStartAfter",
        "variableName": "monthlyStart"
      },
      (v32/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v35 = [
  {
    "kind": "Literal",
    "name": "input",
    "value": {
      "period": "total",
      "scopeType": "model_provider_credential"
    }
  }
],
v36 = {
  "alias": null,
  "args": null,
  "concreteType": "ModelProviderCredential",
  "kind": "LinkedField",
  "name": "ModelProviderCredentials",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "baseUrl",
      "storageKey": null
    },
    (v2/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "modelProvider",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "status",
      "storageKey": null
    },
    (v4/*: any*/)
  ],
  "storageKey": null
},
v37 = [
  (v8/*: any*/),
  (v9/*: any*/),
  (v10/*: any*/),
  (v11/*: any*/),
  (v12/*: any*/),
  (v13/*: any*/),
  (v14/*: any*/),
  (v15/*: any*/),
  (v16/*: any*/),
  (v17/*: any*/),
  (v18/*: any*/),
  (v19/*: any*/),
  (v20/*: any*/),
  (v21/*: any*/),
  (v22/*: any*/),
  (v23/*: any*/),
  (v24/*: any*/),
  (v25/*: any*/),
  (v26/*: any*/),
  (v27/*: any*/),
  (v28/*: any*/),
  (v29/*: any*/),
  (v30/*: any*/),
  (v1/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "usagePageQuery",
    "selections": [
      (v3/*: any*/),
      (v6/*: any*/),
      {
        "alias": "companyTotal",
        "args": (v7/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v31/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v33/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v31/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v34/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v31/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerTotals",
        "args": (v35/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v31/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"model_provider_credential\"})"
      },
      (v36/*: any*/)
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "usagePageQuery",
    "selections": [
      (v3/*: any*/),
      (v6/*: any*/),
      {
        "alias": "companyTotal",
        "args": (v7/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v37/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v33/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v37/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v34/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v37/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerTotals",
        "args": (v35/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v37/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"model_provider_credential\"})"
      },
      (v36/*: any*/)
    ]
  },
  "params": {
    "cacheID": "6f781f6652ad315cd0c05e9b138b00e7",
    "id": null,
    "metadata": {},
    "name": "usagePageQuery",
    "operationKind": "query",
    "text": "query usagePageQuery(\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  Me {\n    company {\n      id\n      name\n    }\n  }\n  CompanyWallet {\n    currentPlan\n    pendingPlan\n    pendingPlanEffectiveAt\n    totalBalanceNanoUsd\n    nextRechargeAmountNanoUsd\n    nextRechargeAt\n    wallets {\n      id\n      type\n      amountNanoUsd\n    }\n    transactions {\n      id\n      category\n      amountNanoUsd\n      createdAt\n    }\n  }\n  companyTotal: LlmUsageAggregates(input: {scopeType: company, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  companyDaily: LlmUsageAggregates(input: {scopeType: company, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  companyMonthly: LlmUsageAggregates(input: {scopeType: company, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  providerTotals: LlmUsageAggregates(input: {scopeType: model_provider_credential, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  ModelProviderCredentials {\n    id\n    baseUrl\n    name\n    modelProvider\n    status\n    type\n  }\n}\n"
  }
};
})();

(node as any).hash = "9e9e48b81814df400a4a64e87cd05b04";

export default node;
