/**
 * @generated SignedSource<<d0a8c0666649ef79813eb3336247f774>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LlmUsageAggregatePeriod = "day" | "month" | "total" | "%future added value";
export type LlmUsageAggregateScope = "agent" | "company" | "model_provider_credential" | "session" | "%future added value";
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
    readonly modelProvider: string;
    readonly name: string;
    readonly refreshedAt: string | null | undefined;
    readonly status: string;
    readonly type: string;
    readonly updatedAt: string;
  }>;
  readonly providerDaily: ReadonlyArray<{
    readonly agentId: string | null | undefined;
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteTokens: number;
    readonly companyId: string;
    readonly inputCostNanoUsd: number;
    readonly inputTokens: number;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly outputCostNanoUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeType: LlmUsageAggregateScope;
    readonly sessionId: string | null | undefined;
    readonly totalCostNanoUsd: number;
    readonly totalTokens: number;
  }>;
  readonly providerMonthly: ReadonlyArray<{
    readonly agentId: string | null | undefined;
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteTokens: number;
    readonly companyId: string;
    readonly inputCostNanoUsd: number;
    readonly inputTokens: number;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly outputCostNanoUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeType: LlmUsageAggregateScope;
    readonly sessionId: string | null | undefined;
    readonly totalCostNanoUsd: number;
    readonly totalTokens: number;
  }>;
  readonly providerTotal: ReadonlyArray<{
    readonly agentId: string | null | undefined;
    readonly cacheReadCostNanoUsd: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteCostNanoUsd: number;
    readonly cacheWriteTokens: number;
    readonly companyId: string;
    readonly inputCostNanoUsd: number;
    readonly inputTokens: number;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly outputCostNanoUsd: number;
    readonly outputTokens: number;
    readonly period: LlmUsageAggregatePeriod;
    readonly periodStart: string;
    readonly requestCount: number;
    readonly scopeType: LlmUsageAggregateScope;
    readonly sessionId: string | null | undefined;
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
  "kind": "Variable",
  "name": "modelProviderCredentialId",
  "variableName": "credentialId"
},
v6 = [
  (v5/*: any*/)
],
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialId",
  "storageKey": null
},
v8 = [
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
v9 = {
  "alias": null,
  "args": (v6/*: any*/),
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
    (v7/*: any*/),
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
          "selections": (v8/*: any*/),
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
          "selections": (v8/*: any*/),
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": (v6/*: any*/),
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
v11 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "model_provider_credential"
},
v12 = [
  {
    "fields": [
      (v5/*: any*/),
      {
        "kind": "Literal",
        "name": "period",
        "value": "total"
      },
      (v11/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v13 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoUsd",
  "storageKey": null
},
v14 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v16 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
  "storageKey": null
},
v20 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputTokens",
  "storageKey": null
},
v21 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "period",
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v23 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "requestCount",
  "storageKey": null
},
v24 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "companyId",
  "storageKey": null
},
v25 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "agentId",
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
  "name": "totalTokens",
  "storageKey": null
},
v30 = [
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
  (v7/*: any*/),
  (v26/*: any*/),
  (v27/*: any*/),
  (v28/*: any*/),
  (v29/*: any*/)
],
v31 = [
  {
    "fields": [
      (v5/*: any*/),
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
      (v11/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v32 = [
  {
    "fields": [
      (v5/*: any*/),
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
      (v11/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v33 = [
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
  (v7/*: any*/),
  (v26/*: any*/),
  (v27/*: any*/),
  (v28/*: any*/),
  (v29/*: any*/),
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
      (v9/*: any*/),
      (v10/*: any*/),
      {
        "alias": "providerTotal",
        "args": (v12/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v30/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerDaily",
        "args": (v31/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v30/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerMonthly",
        "args": (v32/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v30/*: any*/),
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
      (v9/*: any*/),
      (v10/*: any*/),
      {
        "alias": "providerTotal",
        "args": (v12/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v33/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerDaily",
        "args": (v31/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v33/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerMonthly",
        "args": (v32/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v33/*: any*/),
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "edfe3cef51d16db3377151487844d06d",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageQuery",
    "operationKind": "query",
    "text": "query credentialDetailPageQuery(\n  $credentialId: ID!\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  ModelProviderCredentials {\n    id\n    baseUrl\n    name\n    modelProvider\n    type\n    status\n    errorMessage\n    refreshedAt\n    updatedAt\n  }\n  CodexRateLimits(modelProviderCredentialId: $credentialId) {\n    isCodexCredential\n    modelProviderCredentialId\n    snapshots {\n      credits {\n        balance\n        hasCredits\n        unlimited\n      }\n      lastError\n      limitId\n      limitName\n      planType\n      primary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n      rateLimitReachedType\n      refreshedAt\n      secondary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n    }\n  }\n  ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {\n    id\n    isDefault\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n  }\n  providerTotal: LlmUsageAggregates(input: {scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  providerDaily: LlmUsageAggregates(input: {scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  providerMonthly: LlmUsageAggregates(input: {scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "bca7805414738c78173cb01e84166d63";

export default node;
