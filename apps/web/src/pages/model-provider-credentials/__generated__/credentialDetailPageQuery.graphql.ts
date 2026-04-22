/**
 * @generated SignedSource<<2e1f588c6b05712c3d7867dd0d05b38b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "pro" | "%future added value";
export type LlmUsageAggregatePeriod = "day" | "month" | "total" | "%future added value";
export type LlmUsageAggregateScope = "agent" | "company" | "provider" | "session" | "%future added value";
export type credentialDetailPageQuery$variables = {
  credentialId: string;
  dailyStart: string;
  monthlyStart: string;
};
export type credentialDetailPageQuery$data = {
  readonly CompanyManagedLlmBudget: {
    readonly daily: {
      readonly exhausted: boolean;
      readonly limitCostNanoUsd: number | null | undefined;
      readonly overageCostNanoUsd: number;
      readonly period: LlmUsageAggregatePeriod;
      readonly periodStart: string;
      readonly remainingCostNanoUsd: number | null | undefined;
      readonly usedCostNanoUsd: number;
    };
    readonly managedCredentialId: string | null | undefined;
    readonly monthly: {
      readonly exhausted: boolean;
      readonly limitCostNanoUsd: number | null | undefined;
      readonly overageCostNanoUsd: number;
      readonly period: LlmUsageAggregatePeriod;
      readonly periodStart: string;
      readonly remainingCostNanoUsd: number | null | undefined;
      readonly usedCostNanoUsd: number;
    };
    readonly plan: CompanySubscriptionPlan;
  };
  readonly ModelProviderCredentialModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
  }>;
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly isManaged: boolean;
    readonly modelProvider: string;
    readonly name: string;
    readonly refreshedAt: string | null | undefined;
    readonly status: string;
    readonly type: string;
    readonly updatedAt: string;
  }>;
  readonly providerDaily: ReadonlyArray<{
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteTokens: number;
    readonly inputCostNanoUsd: number;
    readonly inputTokens: number;
    readonly outputCostNanoUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeId: string;
    readonly scopeType: LlmUsageAggregateScope;
    readonly totalCostNanoUsd: number;
    readonly totalTokens: number;
  }>;
  readonly providerMonthly: ReadonlyArray<{
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteTokens: number;
    readonly inputCostNanoUsd: number;
    readonly inputTokens: number;
    readonly outputCostNanoUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeId: string;
    readonly scopeType: LlmUsageAggregateScope;
    readonly totalCostNanoUsd: number;
    readonly totalTokens: number;
  }>;
  readonly providerTotal: ReadonlyArray<{
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteTokens: number;
    readonly inputCostNanoUsd: number;
    readonly inputTokens: number;
    readonly outputCostNanoUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeId: string;
    readonly scopeType: LlmUsageAggregateScope;
    readonly totalCostNanoUsd: number;
    readonly totalTokens: number;
  }>;
};
export type credentialDetailPageQuery = {
  response: credentialDetailPageQuery$data;
  variables: credentialDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "credentialId"
  },
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
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isManaged",
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
      "name": "type",
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
      "name": "errorMessage",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "refreshedAt",
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
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "period",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v6 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "exhausted",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "limitCostNanoUsd",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "overageCostNanoUsd",
    "storageKey": null
  },
  (v4/*: any*/),
  (v5/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "remainingCostNanoUsd",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "usedCostNanoUsd",
    "storageKey": null
  }
],
v7 = {
  "alias": null,
  "args": null,
  "concreteType": "CompanyManagedLlmBudget",
  "kind": "LinkedField",
  "name": "CompanyManagedLlmBudget",
  "plural": false,
  "selections": [
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
      "name": "managedCredentialId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "CompanyManagedLlmBudgetPeriod",
      "kind": "LinkedField",
      "name": "daily",
      "plural": false,
      "selections": (v6/*: any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "CompanyManagedLlmBudgetPeriod",
      "kind": "LinkedField",
      "name": "monthly",
      "plural": false,
      "selections": (v6/*: any*/),
      "storageKey": null
    }
  ],
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": [
    {
      "kind": "Variable",
      "name": "modelProviderCredentialId",
      "variableName": "credentialId"
    }
  ],
  "concreteType": "ModelProviderCredentialModel",
  "kind": "LinkedField",
  "name": "ModelProviderCredentialModels",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isDefault",
      "storageKey": null
    },
    (v2/*: any*/),
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
      "name": "reasoningSupported",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "reasoningLevels",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v9 = {
  "kind": "Variable",
  "name": "scopeId",
  "variableName": "credentialId"
},
v10 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "provider"
},
v11 = [
  {
    "fields": [
      {
        "kind": "Literal",
        "name": "period",
        "value": "total"
      },
      (v9/*: any*/),
      (v10/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoUsd",
  "storageKey": null
},
v13 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v14 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v16 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
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
  "name": "requestCount",
  "storageKey": null
},
v21 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeId",
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v23 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v24 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v25 = [
  (v12/*: any*/),
  (v13/*: any*/),
  (v14/*: any*/),
  (v15/*: any*/),
  (v16/*: any*/),
  (v17/*: any*/),
  (v18/*: any*/),
  (v19/*: any*/),
  (v4/*: any*/),
  (v5/*: any*/),
  (v20/*: any*/),
  (v21/*: any*/),
  (v22/*: any*/),
  (v23/*: any*/),
  (v24/*: any*/)
],
v26 = [
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
      (v9/*: any*/),
      (v10/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v27 = [
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
      (v9/*: any*/),
      (v10/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v28 = [
  (v12/*: any*/),
  (v13/*: any*/),
  (v14/*: any*/),
  (v15/*: any*/),
  (v16/*: any*/),
  (v17/*: any*/),
  (v18/*: any*/),
  (v19/*: any*/),
  (v4/*: any*/),
  (v5/*: any*/),
  (v20/*: any*/),
  (v21/*: any*/),
  (v22/*: any*/),
  (v23/*: any*/),
  (v24/*: any*/),
  (v1/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "credentialDetailPageQuery",
    "selections": [
      (v3/*: any*/),
      (v7/*: any*/),
      (v8/*: any*/),
      {
        "alias": "providerTotal",
        "args": (v11/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v25/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerDaily",
        "args": (v26/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v25/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerMonthly",
        "args": (v27/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v25/*: any*/),
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageQuery",
    "selections": [
      (v3/*: any*/),
      (v7/*: any*/),
      (v8/*: any*/),
      {
        "alias": "providerTotal",
        "args": (v11/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v28/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerDaily",
        "args": (v26/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v28/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerMonthly",
        "args": (v27/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v28/*: any*/),
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "d6f89f0fff0868aa38da3c8151909fc8",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageQuery",
    "operationKind": "query",
    "text": "query credentialDetailPageQuery(\n  $credentialId: ID!\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  ModelProviderCredentials {\n    id\n    baseUrl\n    isManaged\n    name\n    modelProvider\n    type\n    status\n    errorMessage\n    refreshedAt\n    updatedAt\n  }\n  CompanyManagedLlmBudget {\n    plan\n    managedCredentialId\n    daily {\n      exhausted\n      limitCostNanoUsd\n      overageCostNanoUsd\n      period\n      periodStart\n      remainingCostNanoUsd\n      usedCostNanoUsd\n    }\n    monthly {\n      exhausted\n      limitCostNanoUsd\n      overageCostNanoUsd\n      period\n      periodStart\n      remainingCostNanoUsd\n      usedCostNanoUsd\n    }\n  }\n  ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {\n    id\n    isDefault\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n  }\n  providerTotal: LlmUsageAggregates(input: {scopeType: provider, scopeId: $credentialId, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  providerDaily: LlmUsageAggregates(input: {scopeType: provider, scopeId: $credentialId, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  providerMonthly: LlmUsageAggregates(input: {scopeType: provider, scopeId: $credentialId, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "9c83a19c9944e4e1e857ce232af3ae5a";

export default node;
