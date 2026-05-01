/**
 * @generated SignedSource<<6bc8bf8becffdd0ec8535145e426f1eb>>
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
export type dashboardPageQuery$variables = {
  dailyStart: string;
  monthlyStart: string;
};
export type dashboardPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
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
  readonly Environments: ReadonlyArray<{
    readonly agentName: string | null | undefined;
    readonly displayName: string | null | undefined;
    readonly id: string;
    readonly provider: string;
    readonly providerEnvironmentId: string;
    readonly status: string;
    readonly updatedAt: string;
  }>;
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
    };
  };
  readonly Tasks: ReadonlyArray<{
    readonly assignee: {
      readonly id: string;
      readonly name: string;
    } | null | undefined;
    readonly completedAt: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly taskStageName: string;
    readonly updatedAt: string;
  }>;
  readonly WorkflowRuns: ReadonlyArray<{
    readonly agentId: string;
    readonly completedAt: string | null | undefined;
    readonly id: string;
    readonly sessionId: string;
    readonly source: string;
    readonly startedAt: string | null | undefined;
    readonly status: string;
    readonly steps: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly ordinal: number;
      readonly status: string;
      readonly workflowRunId: string;
    }>;
    readonly updatedAt: string;
    readonly workflowDefinitionId: string | null | undefined;
  }>;
  readonly Workflows: ReadonlyArray<{
    readonly id: string;
    readonly isEnabled: boolean;
    readonly name: string;
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
};
export type dashboardPageQuery = {
  response: dashboardPageQuery$data;
  variables: dashboardPageQuery$variables;
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
v3 = [
  (v1/*: any*/),
  (v2/*: any*/)
],
v4 = {
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
      "selections": (v3/*: any*/),
      "storageKey": null
    }
  ],
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "concreteType": "Agent",
  "kind": "LinkedField",
  "name": "Agents",
  "plural": true,
  "selections": (v3/*: any*/),
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "completedAt",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "concreteType": "Task",
  "kind": "LinkedField",
  "name": "Tasks",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    (v2/*: any*/),
    (v6/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "taskStageName",
      "storageKey": null
    },
    (v7/*: any*/),
    (v8/*: any*/),
    {
      "alias": null,
      "args": null,
      "concreteType": "TaskAssignee",
      "kind": "LinkedField",
      "name": "assignee",
      "plural": false,
      "selections": (v3/*: any*/),
      "storageKey": null
    }
  ],
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "concreteType": "Workflow",
  "kind": "LinkedField",
  "name": "Workflows",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    (v2/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isEnabled",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v11 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "agentId",
  "storageKey": null
},
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "sessionId",
  "storageKey": null
},
v13 = {
  "alias": null,
  "args": null,
  "concreteType": "WorkflowRun",
  "kind": "LinkedField",
  "name": "WorkflowRuns",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "workflowDefinitionId",
      "storageKey": null
    },
    (v6/*: any*/),
    (v11/*: any*/),
    (v12/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "source",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "startedAt",
      "storageKey": null
    },
    (v7/*: any*/),
    (v8/*: any*/),
    {
      "alias": null,
      "args": null,
      "concreteType": "WorkflowRunStep",
      "kind": "LinkedField",
      "name": "steps",
      "plural": true,
      "selections": [
        (v1/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "workflowRunId",
          "storageKey": null
        },
        (v2/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "ordinal",
          "storageKey": null
        },
        (v6/*: any*/)
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
},
v14 = {
  "alias": null,
  "args": null,
  "concreteType": "Environment",
  "kind": "LinkedField",
  "name": "Environments",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "agentName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "displayName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "provider",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "providerEnvironmentId",
      "storageKey": null
    },
    (v6/*: any*/),
    (v8/*: any*/)
  ],
  "storageKey": null
},
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "amountNanoUsd",
  "storageKey": null
},
v16 = {
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
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "type",
          "storageKey": null
        },
        (v15/*: any*/)
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
        (v15/*: any*/),
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
v17 = [
  {
    "kind": "Literal",
    "name": "input",
    "value": {
      "period": "total",
      "scopeType": "company"
    }
  }
],
v18 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoUsd",
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoVirtualUsd",
  "storageKey": null
},
v20 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v21 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoVirtualUsd",
  "storageKey": null
},
v23 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v24 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v25 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoVirtualUsd",
  "storageKey": null
},
v26 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v27 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
  "storageKey": null
},
v28 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoVirtualUsd",
  "storageKey": null
},
v29 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputTokens",
  "storageKey": null
},
v30 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "period",
  "storageKey": null
},
v31 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v32 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "requestCount",
  "storageKey": null
},
v33 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "companyId",
  "storageKey": null
},
v34 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialId",
  "storageKey": null
},
v35 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v36 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v37 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoVirtualUsd",
  "storageKey": null
},
v38 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v39 = [
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
  (v31/*: any*/),
  (v32/*: any*/),
  (v33/*: any*/),
  (v11/*: any*/),
  (v34/*: any*/),
  (v12/*: any*/),
  (v35/*: any*/),
  (v36/*: any*/),
  (v37/*: any*/),
  (v38/*: any*/)
],
v40 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "company"
},
v41 = [
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
      (v40/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v42 = [
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
      (v40/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v43 = [
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
  (v31/*: any*/),
  (v32/*: any*/),
  (v33/*: any*/),
  (v11/*: any*/),
  (v34/*: any*/),
  (v12/*: any*/),
  (v35/*: any*/),
  (v36/*: any*/),
  (v37/*: any*/),
  (v38/*: any*/),
  (v1/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "dashboardPageQuery",
    "selections": [
      (v4/*: any*/),
      (v5/*: any*/),
      (v9/*: any*/),
      (v10/*: any*/),
      (v13/*: any*/),
      (v14/*: any*/),
      (v16/*: any*/),
      {
        "alias": "companyTotal",
        "args": (v17/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v39/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v41/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v39/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v42/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v39/*: any*/),
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
    "name": "dashboardPageQuery",
    "selections": [
      (v4/*: any*/),
      (v5/*: any*/),
      (v9/*: any*/),
      (v10/*: any*/),
      (v13/*: any*/),
      (v14/*: any*/),
      (v16/*: any*/),
      {
        "alias": "companyTotal",
        "args": (v17/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v43/*: any*/),
        "storageKey": "LlmUsageAggregates(input:{\"period\":\"total\",\"scopeType\":\"company\"})"
      },
      {
        "alias": "companyDaily",
        "args": (v41/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v43/*: any*/),
        "storageKey": null
      },
      {
        "alias": "companyMonthly",
        "args": (v42/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v43/*: any*/),
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "2709a2ca4f972294f41d0c9e354eb08c",
    "id": null,
    "metadata": {},
    "name": "dashboardPageQuery",
    "operationKind": "query",
    "text": "query dashboardPageQuery(\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  Me {\n    company {\n      id\n      name\n    }\n  }\n  Agents {\n    id\n    name\n  }\n  Tasks {\n    id\n    name\n    status\n    taskStageName\n    completedAt\n    updatedAt\n    assignee {\n      id\n      name\n    }\n  }\n  Workflows {\n    id\n    name\n    isEnabled\n  }\n  WorkflowRuns {\n    id\n    workflowDefinitionId\n    status\n    agentId\n    sessionId\n    source\n    startedAt\n    completedAt\n    updatedAt\n    steps {\n      id\n      workflowRunId\n      name\n      ordinal\n      status\n    }\n  }\n  Environments {\n    id\n    agentName\n    displayName\n    provider\n    providerEnvironmentId\n    status\n    updatedAt\n  }\n  CompanyWallet {\n    currentPlan\n    pendingPlan\n    pendingPlanEffectiveAt\n    totalBalanceNanoUsd\n    nextRechargeAmountNanoUsd\n    nextRechargeAt\n    wallets {\n      id\n      type\n      amountNanoUsd\n    }\n    transactions {\n      id\n      category\n      amountNanoUsd\n      createdAt\n    }\n  }\n  companyTotal: LlmUsageAggregates(input: {scopeType: company, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  companyDaily: LlmUsageAggregates(input: {scopeType: company, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n  companyMonthly: LlmUsageAggregates(input: {scopeType: company, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadCostNanoVirtualUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteCostNanoVirtualUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputCostNanoVirtualUsd\n    inputTokens\n    outputCostNanoUsd\n    outputCostNanoVirtualUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    companyId\n    agentId\n    modelProviderCredentialId\n    sessionId\n    scopeType\n    totalCostNanoUsd\n    totalCostNanoVirtualUsd\n    totalTokens\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "78736f0fbcdf9110c6ae7eedc98f640b";

export default node;
