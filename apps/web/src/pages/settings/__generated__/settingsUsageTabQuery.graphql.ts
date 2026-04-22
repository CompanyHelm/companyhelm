/**
 * @generated SignedSource<<48e263635cf2b9700b554a784fb8cad6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LlmUsageAggregatePeriod = "day" | "month" | "total" | "%future added value";
export type LlmUsageAggregateScope = "agent" | "company" | "provider" | "session" | "%future added value";
export type settingsUsageTabQuery$variables = {
  dailyStart: string;
  monthlyStart: string;
};
export type settingsUsageTabQuery$data = {
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
    };
  };
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly id: string;
    readonly isManaged: boolean;
    readonly modelProvider: string;
    readonly name: string;
    readonly status: string;
    readonly type: string;
  }>;
  readonly companyDaily: ReadonlyArray<{
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
  readonly companyMonthly: ReadonlyArray<{
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
  readonly companyTotal: ReadonlyArray<{
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
  readonly providerTotals: ReadonlyArray<{
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
export type settingsUsageTabQuery = {
  response: settingsUsageTabQuery$data;
  variables: settingsUsageTabQuery$variables;
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
  "name": "scopeId",
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v20 = [
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
  (v19/*: any*/)
],
v21 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "company"
},
v22 = [
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
      (v21/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v23 = [
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
      (v21/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v24 = [
  {
    "kind": "Literal",
    "name": "input",
    "value": {
      "period": "total",
      "scopeType": "provider"
    }
  }
],
v25 = {
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
      "name": "status",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "type",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v26 = [
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
  (v1/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "settingsUsageTabQuery",
    "selections": [
      (v3/*: any*/),
      {
        "alias": "companyTotal",
        "args": (v4/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v20/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v22/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v20/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v23/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v20/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerTotals",
        "args": (v24/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v20/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"provider\"})"
      },
      (v25/*: any*/)
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "settingsUsageTabQuery",
    "selections": [
      (v3/*: any*/),
      {
        "alias": "companyTotal",
        "args": (v4/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v26/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v22/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v26/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v23/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v26/*: any*/),
        "storageKey": null
      },
      {
        "alias": "providerTotals",
        "args": (v24/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v26/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"provider\"})"
      },
      (v25/*: any*/)
    ]
  },
  "params": {
    "cacheID": "f42be4e6f66325fb4f2a0433414b2c2f",
    "id": null,
    "metadata": {},
    "name": "settingsUsageTabQuery",
    "operationKind": "query",
    "text": "query settingsUsageTabQuery(\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  Me {\n    company {\n      id\n      name\n    }\n  }\n  companyTotal: LlmUsageAggregates(input: {scopeType: company, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  companyDaily: LlmUsageAggregates(input: {scopeType: company, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  companyMonthly: LlmUsageAggregates(input: {scopeType: company, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  providerTotals: LlmUsageAggregates(input: {scopeType: provider, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  ModelProviderCredentials {\n    id\n    baseUrl\n    isManaged\n    name\n    modelProvider\n    status\n    type\n  }\n}\n"
  }
};
})();

(node as any).hash = "abcff0a640096558a63c4c53ac41175d";

export default node;
