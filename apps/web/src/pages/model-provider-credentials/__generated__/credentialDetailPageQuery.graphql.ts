/**
 * @generated SignedSource<<f20b2a0b5ee827a079d22a166f0f2359>>
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
  readonly CodexRateLimits: {
    readonly isCodexCredential: boolean;
    readonly modelProviderCredentialId: string;
    readonly snapshots: ReadonlyArray<{
      readonly credits: {
        readonly balance: string | null | undefined;
        readonly hasCredits: boolean | null | undefined;
        readonly unlimited: boolean | null | undefined;
      };
      readonly lastError: string | null | undefined;
      readonly limitId: string;
      readonly limitName: string | null | undefined;
      readonly planType: string | null | undefined;
      readonly primary: {
        readonly resetsAt: string | null | undefined;
        readonly usedPercent: number | null | undefined;
        readonly windowMinutes: number | null | undefined;
      };
      readonly rateLimitReachedType: string | null | undefined;
      readonly refreshedAt: string;
      readonly secondary: {
        readonly resetsAt: string | null | undefined;
        readonly usedPercent: number | null | undefined;
        readonly windowMinutes: number | null | undefined;
      };
    }>;
  };
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
    readonly cacheReadCostNanoVirtualUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteCostNanoVirtualUsd: number;
    readonly cacheWriteTokens: number;
    readonly inputCostNanoUsd: number;
    readonly inputCostNanoVirtualUsd: number;
    readonly inputTokens: number;
    readonly outputCostNanoUsd: number;
    readonly outputCostNanoVirtualUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeId: string;
    readonly scopeType: LlmUsageAggregateScope;
    readonly totalCostNanoUsd: number;
    readonly totalCostNanoVirtualUsd: number;
    readonly totalTokens: number;
  }>;
  readonly providerMonthly: ReadonlyArray<{
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadCostNanoVirtualUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteCostNanoVirtualUsd: number;
    readonly cacheWriteTokens: number;
    readonly inputCostNanoUsd: number;
    readonly inputCostNanoVirtualUsd: number;
    readonly inputTokens: number;
    readonly outputCostNanoUsd: number;
    readonly outputCostNanoVirtualUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeId: string;
    readonly scopeType: LlmUsageAggregateScope;
    readonly totalCostNanoUsd: number;
    readonly totalCostNanoVirtualUsd: number;
    readonly totalTokens: number;
  }>;
  readonly providerTotal: ReadonlyArray<{
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadCostNanoVirtualUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteCostNanoVirtualUsd: number;
    readonly cacheWriteTokens: number;
    readonly inputCostNanoUsd: number;
    readonly inputCostNanoVirtualUsd: number;
    readonly inputTokens: number;
    readonly outputCostNanoUsd: number;
    readonly outputCostNanoVirtualUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeId: string;
    readonly scopeType: LlmUsageAggregateScope;
    readonly totalCostNanoUsd: number;
    readonly totalCostNanoVirtualUsd: number;
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
  "kind": "ScalarField",
  "name": "refreshedAt",
  "storageKey": null
},
v4 = {
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
    (v3/*: any*/),
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
  "name": "period",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v7 = [
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
  (v5/*: any*/),
  (v6/*: any*/),
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
v8 = {
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
      "selections": (v7/*: any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "CompanyManagedLlmBudgetPeriod",
      "kind": "LinkedField",
      "name": "monthly",
      "plural": false,
      "selections": (v7/*: any*/),
      "storageKey": null
    }
  ],
  "storageKey": null
},
v9 = [
  {
    "kind": "Variable",
    "name": "modelProviderCredentialId",
    "variableName": "credentialId"
  }
],
v10 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "resetsAt",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "usedPercent",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "windowMinutes",
    "storageKey": null
  }
],
v11 = {
  "alias": null,
  "args": (v9/*: any*/),
  "concreteType": "CodexRateLimits",
  "kind": "LinkedField",
  "name": "CodexRateLimits",
  "plural": false,
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isCodexCredential",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "modelProviderCredentialId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "CodexRateLimitSnapshot",
      "kind": "LinkedField",
      "name": "snapshots",
      "plural": true,
      "selections": [
        {
          "alias": null,
          "args": null,
          "concreteType": "CodexRateLimitCredits",
          "kind": "LinkedField",
          "name": "credits",
          "plural": false,
          "selections": [
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "balance",
              "storageKey": null
            },
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "hasCredits",
              "storageKey": null
            },
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "unlimited",
              "storageKey": null
            }
          ],
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "lastError",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "limitId",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "limitName",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "planType",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "concreteType": "CodexRateLimitWindow",
          "kind": "LinkedField",
          "name": "primary",
          "plural": false,
          "selections": (v10/*: any*/),
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "rateLimitReachedType",
          "storageKey": null
        },
        (v3/*: any*/),
        {
          "alias": null,
          "args": null,
          "concreteType": "CodexRateLimitWindow",
          "kind": "LinkedField",
          "name": "secondary",
          "plural": false,
          "selections": (v10/*: any*/),
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
},
v12 = {
  "alias": null,
  "args": (v9/*: any*/),
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
v13 = {
  "kind": "Variable",
  "name": "scopeId",
  "variableName": "credentialId"
},
v14 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "provider"
},
v15 = [
  {
    "fields": [
      {
        "kind": "Literal",
        "name": "period",
        "value": "total"
      },
      (v13/*: any*/),
      (v14/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v16 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoUsd",
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoVirtualUsd",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v20 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoVirtualUsd",
  "storageKey": null
},
v21 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v23 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoVirtualUsd",
  "storageKey": null
},
v24 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v25 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
  "storageKey": null
},
v26 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoVirtualUsd",
  "storageKey": null
},
v27 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputTokens",
  "storageKey": null
},
v28 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "requestCount",
  "storageKey": null
},
v29 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeId",
  "storageKey": null
},
v30 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v31 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v32 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoVirtualUsd",
  "storageKey": null
},
v33 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v34 = [
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
  (v5/*: any*/),
  (v6/*: any*/),
  (v28/*: any*/),
  (v29/*: any*/),
  (v30/*: any*/),
  (v31/*: any*/),
  (v32/*: any*/),
  (v33/*: any*/)
],
v35 = [
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
      (v13/*: any*/),
      (v14/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v36 = [
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
      (v13/*: any*/),
      (v14/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v37 = [
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
  (v5/*: any*/),
  (v6/*: any*/),
  (v28/*: any*/),
  (v29/*: any*/),
  (v30/*: any*/),
  (v31/*: any*/),
  (v32/*: any*/),
  (v33/*: any*/),
  (v1/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "credentialDetailPageQuery",
    "selections": [
      (v4/*: any*/),
      (v8/*: any*/),
      (v11/*: any*/),
      (v12/*: any*/),
      {
        "alias": "providerTotal",
        "args": (v15/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v34/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerDaily",
        "args": (v35/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v34/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerMonthly",
        "args": (v36/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v34/*: any*/),
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
      (v4/*: any*/),
      (v8/*: any*/),
      (v11/*: any*/),
      (v12/*: any*/),
      {
        "alias": "providerTotal",
        "args": (v15/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v37/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerDaily",
        "args": (v35/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v37/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerMonthly",
        "args": (v36/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v37/*: any*/),
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "e904b1725e014e49d118edd6fa5a73c4",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageQuery",
    "operationKind": "query",
    "text": "query credentialDetailPageQuery(\n  $credentialId: ID!\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  ModelProviderCredentials {\n    id\n    baseUrl\n    isManaged\n    name\n    modelProvider\n    type\n    status\n    errorMessage\n    refreshedAt\n    updatedAt\n  }\n  CompanyManagedLlmBudget {\n    plan\n    managedCredentialId\n    daily {\n      exhausted\n      limitCostNanoUsd\n      overageCostNanoUsd\n      period\n      periodStart\n      remainingCostNanoUsd\n      usedCostNanoUsd\n    }\n    monthly {\n      exhausted\n      limitCostNanoUsd\n      overageCostNanoUsd\n      period\n      periodStart\n      remainingCostNanoUsd\n      usedCostNanoUsd\n    }\n  }\n  CodexRateLimits(modelProviderCredentialId: $credentialId) {\n    isCodexCredential\n    modelProviderCredentialId\n    snapshots {\n      credits {\n        balance\n        hasCredits\n        unlimited\n      }\n      lastError\n      limitId\n      limitName\n      planType\n      primary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n      rateLimitReachedType\n      refreshedAt\n      secondary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n    }\n  }\n  ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {\n    id\n    isDefault\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n  }\n  providerTotal: LlmUsageAggregates(input: {scopeType: provider, scopeId: $credentialId, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  providerDaily: LlmUsageAggregates(input: {scopeType: provider, scopeId: $credentialId, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  providerMonthly: LlmUsageAggregates(input: {scopeType: provider, scopeId: $credentialId, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "ed79e271d5d60476a7abf6528ee5642f";

export default node;
