/**
 * @generated SignedSource<<e3ce5991cb970334aee862f6c7857f7a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LlmUsageAggregatePeriod = "day" | "month" | "total" | "%future added value";
export type LlmUsageAggregateScope = "agent" | "company" | "managed_model_provider_credential" | "model_provider_credential" | "session" | "%future added value";
export type credentialDetailPageQuery$variables = {
  credentialId: string;
  dailyStart: string;
  isManagedCredential: boolean;
  monthlyStart: string;
};
export type credentialDetailPageQuery$data = {
  readonly AgentCreateOptions?: ReadonlyArray<{
    readonly defaultModelId: string | null | undefined;
    readonly id: string;
    readonly label: string;
    readonly modelCredentialSource: string;
    readonly modelProvider: string;
    readonly models: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly modelCredentialSource: string;
      readonly modelId: string;
      readonly name: string;
      readonly platformModelId: string | null | undefined;
      readonly reasoningLevels: ReadonlyArray<string>;
      readonly reasoningSupported: boolean;
    }>;
  }>;
  readonly CodexRateLimits?: {
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
  readonly CompanySettings?: {
    readonly companyId: string;
    readonly defaultManagedPlatformModelId: string | null | undefined;
  };
  readonly ModelProviderCredentialModels?: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
  }>;
  readonly ModelProviderCredentials?: ReadonlyArray<{
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
  readonly managedDaily?: ReadonlyArray<{
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
  readonly managedMonthly?: ReadonlyArray<{
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
  readonly managedTotal?: ReadonlyArray<{
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
  readonly providerDaily?: ReadonlyArray<{
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
  readonly providerMonthly?: ReadonlyArray<{
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
  readonly providerTotal?: ReadonlyArray<{
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
export type credentialDetailPageQuery = {
  response: credentialDetailPageQuery$data;
  variables: credentialDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "credentialId"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "dailyStart"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "isManagedCredential"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "monthlyStart"
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "companyId",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "concreteType": "CompanySettings",
  "kind": "LinkedField",
  "name": "CompanySettings",
  "plural": false,
  "selections": [
    (v4/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "defaultManagedPlatformModelId",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelCredentialSource",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
},
v11 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "reasoningSupported",
  "storageKey": null
},
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "reasoningLevels",
  "storageKey": null
},
v13 = {
  "alias": null,
  "args": null,
  "concreteType": "AgentCreateProviderOption",
  "kind": "LinkedField",
  "name": "AgentCreateOptions",
  "plural": true,
  "selections": [
    (v6/*: any*/),
    (v7/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "label",
      "storageKey": null
    },
    (v8/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "defaultModelId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "AgentCreateModelOption",
      "kind": "LinkedField",
      "name": "models",
      "plural": true,
      "selections": [
        (v6/*: any*/),
        (v7/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "platformModelId",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "modelId",
          "storageKey": null
        },
        (v9/*: any*/),
        (v10/*: any*/),
        (v11/*: any*/),
        (v12/*: any*/)
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
},
v14 = [
  {
    "kind": "Literal",
    "name": "input",
    "value": {
      "period": "total",
      "scopeType": "managed_model_provider_credential"
    }
  }
],
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoUsd",
  "storageKey": null
},
v16 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoVirtualUsd",
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoVirtualUsd",
  "storageKey": null
},
v20 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v21 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoVirtualUsd",
  "storageKey": null
},
v23 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v24 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
  "storageKey": null
},
v25 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoVirtualUsd",
  "storageKey": null
},
v26 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputTokens",
  "storageKey": null
},
v27 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "period",
  "storageKey": null
},
v28 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v29 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "requestCount",
  "storageKey": null
},
v30 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "agentId",
  "storageKey": null
},
v31 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialId",
  "storageKey": null
},
v32 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "sessionId",
  "storageKey": null
},
v33 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v34 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v35 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoVirtualUsd",
  "storageKey": null
},
v36 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v37 = [
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
  (v4/*: any*/),
  (v30/*: any*/),
  (v31/*: any*/),
  (v32/*: any*/),
  (v33/*: any*/),
  (v34/*: any*/),
  (v35/*: any*/),
  (v36/*: any*/)
],
v38 = {
  "kind": "Literal",
  "name": "period",
  "value": "day"
},
v39 = {
  "kind": "Variable",
  "name": "periodStartAfter",
  "variableName": "dailyStart"
},
v40 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "managed_model_provider_credential"
},
v41 = [
  {
    "fields": [
      (v38/*: any*/),
      (v39/*: any*/),
      (v40/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v42 = {
  "kind": "Literal",
  "name": "period",
  "value": "month"
},
v43 = {
  "kind": "Variable",
  "name": "periodStartAfter",
  "variableName": "monthlyStart"
},
v44 = [
  {
    "fields": [
      (v42/*: any*/),
      (v43/*: any*/),
      (v40/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v45 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "refreshedAt",
  "storageKey": null
},
v46 = {
  "alias": null,
  "args": null,
  "concreteType": "ModelProviderCredential",
  "kind": "LinkedField",
  "name": "ModelProviderCredentials",
  "plural": true,
  "selections": [
    (v6/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "baseUrl",
      "storageKey": null
    },
    (v9/*: any*/),
    (v8/*: any*/),
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
    (v45/*: any*/),
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
v47 = {
  "kind": "Variable",
  "name": "modelProviderCredentialId",
  "variableName": "credentialId"
},
v48 = [
  (v47/*: any*/)
],
v49 = [
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
v50 = {
  "alias": null,
  "args": (v48/*: any*/),
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
    (v31/*: any*/),
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
          "selections": (v49/*: any*/),
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "rateLimitReachedType",
          "storageKey": null
        },
        (v45/*: any*/),
        {
          "alias": null,
          "args": null,
          "concreteType": "CodexRateLimitWindow",
          "kind": "LinkedField",
          "name": "secondary",
          "plural": false,
          "selections": (v49/*: any*/),
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
},
v51 = {
  "alias": null,
  "args": (v48/*: any*/),
  "concreteType": "ModelProviderCredentialModel",
  "kind": "LinkedField",
  "name": "ModelProviderCredentialModels",
  "plural": true,
  "selections": [
    (v6/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isDefault",
      "storageKey": null
    },
    (v9/*: any*/),
    (v10/*: any*/),
    (v11/*: any*/),
    (v12/*: any*/)
  ],
  "storageKey": null
},
v52 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "model_provider_credential"
},
v53 = [
  {
    "fields": [
      (v47/*: any*/),
      {
        "kind": "Literal",
        "name": "period",
        "value": "total"
      },
      (v52/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v54 = [
  {
    "fields": [
      (v47/*: any*/),
      (v38/*: any*/),
      (v39/*: any*/),
      (v52/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v55 = [
  {
    "fields": [
      (v47/*: any*/),
      (v42/*: any*/),
      (v43/*: any*/),
      (v52/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v56 = [
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
  (v4/*: any*/),
  (v30/*: any*/),
  (v31/*: any*/),
  (v32/*: any*/),
  (v33/*: any*/),
  (v34/*: any*/),
  (v35/*: any*/),
  (v36/*: any*/),
  (v6/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "credentialDetailPageQuery",
    "selections": [
      {
        "condition": "isManagedCredential",
        "kind": "Condition",
        "passingValue": true,
        "selections": [
          (v5/*: any*/),
          (v13/*: any*/),
          {
            "alias": "managedTotal",
            "args": (v14/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v37/*: any*/),
            "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"managed_model_provider_credential\"})"
          },
          {
            "alias": "managedDaily",
            "args": (v41/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v37/*: any*/),
            "storageKey": null
          },
          {
            "alias": "managedMonthly",
            "args": (v44/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v37/*: any*/),
            "storageKey": null
          }
        ]
      },
      {
        "condition": "isManagedCredential",
        "kind": "Condition",
        "passingValue": false,
        "selections": [
          (v46/*: any*/),
          (v50/*: any*/),
          (v51/*: any*/),
          {
            "alias": "providerTotal",
            "args": (v53/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v37/*: any*/),
            "storageKey": null
          },
          {
            "alias": "providerDaily",
            "args": (v54/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v37/*: any*/),
            "storageKey": null
          },
          {
            "alias": "providerMonthly",
            "args": (v55/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v37/*: any*/),
            "storageKey": null
          }
        ]
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v2/*: any*/),
      (v1/*: any*/),
      (v3/*: any*/)
    ],
    "kind": "Operation",
    "name": "credentialDetailPageQuery",
    "selections": [
      {
        "condition": "isManagedCredential",
        "kind": "Condition",
        "passingValue": true,
        "selections": [
          (v5/*: any*/),
          (v13/*: any*/),
          {
            "alias": "managedTotal",
            "args": (v14/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v56/*: any*/),
            "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"managed_model_provider_credential\"})"
          },
          {
            "alias": "managedDaily",
            "args": (v41/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v56/*: any*/),
            "storageKey": null
          },
          {
            "alias": "managedMonthly",
            "args": (v44/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v56/*: any*/),
            "storageKey": null
          }
        ]
      },
      {
        "condition": "isManagedCredential",
        "kind": "Condition",
        "passingValue": false,
        "selections": [
          (v46/*: any*/),
          (v50/*: any*/),
          (v51/*: any*/),
          {
            "alias": "providerTotal",
            "args": (v53/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v56/*: any*/),
            "storageKey": null
          },
          {
            "alias": "providerDaily",
            "args": (v54/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v56/*: any*/),
            "storageKey": null
          },
          {
            "alias": "providerMonthly",
            "args": (v55/*: any*/),
            "concreteType": "LlmUsageAggregate",
            "kind": "LinkedField",
            "name": "LlmUsageAggregates",
            "plural": true,
            "selections": (v56/*: any*/),
            "storageKey": null
          }
        ]
      }
    ]
  },
  "params": {
    "cacheID": "1d388f7a9176b15aa48f1ed28634de51",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageQuery",
    "operationKind": "query",
    "text": "query credentialDetailPageQuery(\n  $credentialId: ID!\n  $isManagedCredential: Boolean!\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  CompanySettings @include(if: $isManagedCredential) {\n    companyId\n    defaultManagedPlatformModelId\n  }\n  AgentCreateOptions @include(if: $isManagedCredential) {\n    id\n    modelCredentialSource\n    label\n    modelProvider\n    defaultModelId\n    models {\n      id\n      modelCredentialSource\n      platformModelId\n      modelId\n      name\n      description\n      reasoningSupported\n      reasoningLevels\n    }\n  }\n  managedTotal: LlmUsageAggregates(input: {scopeType: managed_model_provider_credential, period: total}) @include(if: $isManagedCredential) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  managedDaily: LlmUsageAggregates(input: {scopeType: managed_model_provider_credential, period: day, periodStartAfter: $dailyStart}) @include(if: $isManagedCredential) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  managedMonthly: LlmUsageAggregates(input: {scopeType: managed_model_provider_credential, period: month, periodStartAfter: $monthlyStart}) @include(if: $isManagedCredential) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  ModelProviderCredentials @skip(if: $isManagedCredential) {\n    id\n    baseUrl\n    name\n    modelProvider\n    type\n    status\n    errorMessage\n    refreshedAt\n    updatedAt\n  }\n  CodexRateLimits(modelProviderCredentialId: $credentialId) @skip(if: $isManagedCredential) {\n    isCodexCredential\n    modelProviderCredentialId\n    snapshots {\n      credits {\n        balance\n        hasCredits\n        unlimited\n      }\n      lastError\n      limitId\n      limitName\n      planType\n      primary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n      rateLimitReachedType\n      refreshedAt\n      secondary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n    }\n  }\n  ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) @skip(if: $isManagedCredential) {\n    id\n    isDefault\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n  }\n  providerTotal: LlmUsageAggregates(input: {scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: total}) @skip(if: $isManagedCredential) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  providerDaily: LlmUsageAggregates(input: {scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: day, periodStartAfter: $dailyStart}) @skip(if: $isManagedCredential) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  providerMonthly: LlmUsageAggregates(input: {scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: month, periodStartAfter: $monthlyStart}) @skip(if: $isManagedCredential) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "5a10e6eae2b3c60b0ac4bc68bb8d2f24";

export default node;
