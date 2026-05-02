/**
 * @generated SignedSource<<e34d7f14e7271be3fbbd7ac33852f703>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LlmUsageAggregatePeriod = "day" | "month" | "total" | "%future added value";
export type LlmUsageAggregateScope = "agent" | "company" | "managed_model_provider_credential" | "model_provider_credential" | "session" | "%future added value";
export type usagePageQuery$variables = {
  dailyStart: string;
  monthlyStart: string;
};
export type usagePageQuery$data = {
  readonly LlmUsageProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly credentialId: string;
    readonly id: string;
    readonly modelCredentialSource: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly status: string;
    readonly total: {
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
      readonly modelCredentialSource: string | null | undefined;
      readonly modelProviderCredentialId: string | null | undefined;
      readonly outputCostNanoUsd: number;
      readonly outputCostNanoVirtualUsd: number;
      readonly outputTokens: number;
      readonly period: LlmUsageAggregatePeriod;
      readonly periodStart: string;
      readonly platformModelProviderCredentialId: string | null | undefined;
      readonly requestCount: number;
      readonly scopeType: LlmUsageAggregateScope;
      readonly sessionId: string | null | undefined;
      readonly totalCostNanoUsd: number;
      readonly totalCostNanoVirtualUsd: number;
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
  "name": "cacheReadCostNanoVirtualUsd",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoVirtualUsd",
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v11 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoVirtualUsd",
  "storageKey": null
},
v13 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v14 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
  "storageKey": null
},
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoVirtualUsd",
  "storageKey": null
},
v16 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputTokens",
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "period",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "requestCount",
  "storageKey": null
},
v20 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "companyId",
  "storageKey": null
},
v21 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "agentId",
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialId",
  "storageKey": null
},
v23 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "sessionId",
  "storageKey": null
},
v24 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v25 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v26 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoVirtualUsd",
  "storageKey": null
},
v27 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v28 = [
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
  (v23/*: any*/),
  (v24/*: any*/),
  (v25/*: any*/),
  (v26/*: any*/),
  (v27/*: any*/)
],
v29 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "company"
},
v30 = [
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
      (v29/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v31 = [
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
      (v29/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v32 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "credentialId",
  "storageKey": null
},
v33 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelCredentialSource",
  "storageKey": null
},
v34 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v35 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v36 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "type",
  "storageKey": null
},
v37 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "baseUrl",
  "storageKey": null
},
v38 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "platformModelProviderCredentialId",
  "storageKey": null
},
v39 = [
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
  (v23/*: any*/),
  (v24/*: any*/),
  (v25/*: any*/),
  (v26/*: any*/),
  (v27/*: any*/),
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
        "selections": (v28/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v30/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v28/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v31/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v28/*: any*/),
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
          (v32/*: any*/),
          (v33/*: any*/),
          (v2/*: any*/),
          (v34/*: any*/),
          (v35/*: any*/),
          (v36/*: any*/),
          (v37/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "total",
            "plural": false,
            "selections": [
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
              (v33/*: any*/),
              (v22/*: any*/),
              (v38/*: any*/),
              (v23/*: any*/),
              (v24/*: any*/),
              (v25/*: any*/),
              (v26/*: any*/),
              (v27/*: any*/)
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
        "selections": (v39/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v30/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v39/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v31/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v39/*: any*/),
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
          (v32/*: any*/),
          (v33/*: any*/),
          (v2/*: any*/),
          (v34/*: any*/),
          (v35/*: any*/),
          (v36/*: any*/),
          (v37/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "total",
            "plural": false,
            "selections": [
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
              (v33/*: any*/),
              (v22/*: any*/),
              (v38/*: any*/),
              (v23/*: any*/),
              (v24/*: any*/),
              (v25/*: any*/),
              (v26/*: any*/),
              (v27/*: any*/),
              (v1/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "a269c5a8dd50d4456748227440267ed9",
    "id": null,
    "metadata": {},
    "name": "usagePageQuery",
    "operationKind": "query",
    "text": "query usagePageQuery(\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  Me {\n    company {\n      id\n      name\n    }\n  }\n  companyTotal: LlmUsageAggregates(input: {scopeType: company, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  companyDaily: LlmUsageAggregates(input: {scopeType: company, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  companyMonthly: LlmUsageAggregates(input: {scopeType: company, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  LlmUsageProviderCredentials {\n    id\n    credentialId\n    modelCredentialSource\n    name\n    modelProvider\n    status\n    type\n    baseUrl\n    total {\n      cacheReadCostNanoUsd\n      cacheReadCostNanoVirtualUsd\n      cacheReadTokens\n      cacheWriteCostNanoUsd\n      cacheWriteCostNanoVirtualUsd\n      cacheWriteTokens\n      inputCostNanoUsd\n      inputCostNanoVirtualUsd\n      inputTokens\n      outputCostNanoUsd\n      outputCostNanoVirtualUsd\n      outputTokens\n      period\n      periodStart\n      requestCount\n      companyId\n      agentId\n      modelCredentialSource\n      modelProviderCredentialId\n      platformModelProviderCredentialId\n      sessionId\n      scopeType\n      totalCostNanoUsd\n      totalCostNanoVirtualUsd\n      totalTokens\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "dcbfe5b8fd978ba4066fdb654641e034";

export default node;
