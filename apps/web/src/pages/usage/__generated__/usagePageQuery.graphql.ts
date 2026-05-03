/**
 * @generated SignedSource<<e39f36cd055a8747cde34a01a841b21b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LlmUsageAggregatePeriod = "day" | "month" | "total" | "%future added value";
export type LlmUsageAggregateScope = "agent" | "company" | "model_provider_credential" | "session" | "%future added value";
export type usagePageQuery$variables = {
  dailyStart: string;
  monthlyStart: string;
};
export type usagePageQuery$data = {
  readonly LlmUsageProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly credentialId: string;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly status: string;
    readonly total: {
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
    };
    readonly type: string;
  }>;
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
    };
  };
  readonly companyDaily: ReadonlyArray<{
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
  readonly companyMonthly: ReadonlyArray<{
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
  readonly companyTotal: ReadonlyArray<{
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
v4 = [
  {
    "kind": "Literal",
    "name": "input",
    "value": {
      "period": "total",
      "scopeType": "company"
    }
  }
],
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoUsd",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v11 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
  "storageKey": null
},
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputTokens",
  "storageKey": null
},
v13 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "period",
  "storageKey": null
},
v14 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "requestCount",
  "storageKey": null
},
v16 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "companyId",
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "agentId",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialId",
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "sessionId",
  "storageKey": null
},
v20 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v21 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v23 = [
  (v5/*: any*/),
  (v6/*: any*/),
  (v7/*: any*/),
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
  (v22/*: any*/)
],
v24 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "company"
},
v25 = [
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
      (v24/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v26 = [
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
      (v24/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v27 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "credentialId",
  "storageKey": null
},
v28 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v29 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v30 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "type",
  "storageKey": null
},
v31 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "baseUrl",
  "storageKey": null
},
v32 = [
  (v5/*: any*/),
  (v6/*: any*/),
  (v7/*: any*/),
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
      {
        "alias": "companyTotal",
        "args": (v4/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v23/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v25/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v23/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v26/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v23/*: any*/),
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "LlmUsageProviderCredential",
        "kind": "LinkedField",
        "name": "LlmUsageProviderCredentials",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          (v27/*: any*/),
          (v2/*: any*/),
          (v28/*: any*/),
          (v29/*: any*/),
          (v30/*: any*/),
          (v31/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "total",
            "plural": false,
            "selections": (v23/*: any*/),
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "usagePageQuery",
    "selections": [
      (v3/*: any*/),
      {
        "alias": "companyTotal",
        "args": (v4/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v32/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v25/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v32/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v26/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v32/*: any*/),
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "LlmUsageProviderCredential",
        "kind": "LinkedField",
        "name": "LlmUsageProviderCredentials",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          (v27/*: any*/),
          (v2/*: any*/),
          (v28/*: any*/),
          (v29/*: any*/),
          (v30/*: any*/),
          (v31/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "total",
            "plural": false,
            "selections": (v32/*: any*/),
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "250fc653da6c93e9e4c33ef88a240707",
    "id": null,
    "metadata": {},
    "name": "usagePageQuery",
    "operationKind": "query",
    "text": "query usagePageQuery(\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  Me {\n    company {\n      id\n      name\n    }\n  }\n  companyTotal: LlmUsageAggregates(input: {scopeType: company, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  companyDaily: LlmUsageAggregates(input: {scopeType: company, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  companyMonthly: LlmUsageAggregates(input: {scopeType: company, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  LlmUsageProviderCredentials {\n    id\n    credentialId\n    name\n    modelProvider\n    status\n    type\n    baseUrl\n    total {\n      cacheReadCostNanoUsd\n      cacheReadTokens\n      cacheWriteCostNanoUsd\n      cacheWriteTokens\n      inputCostNanoUsd\n      inputTokens\n      outputCostNanoUsd\n      outputTokens\n      period\n      periodStart\n      requestCount\n      companyId\n      agentId\n      modelProviderCredentialId\n      sessionId\n      scopeType\n      totalCostNanoUsd\n      totalTokens\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "2a10371e549be03e5df6e1fff674f952";

export default node;
