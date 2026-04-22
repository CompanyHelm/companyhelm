/**
 * @generated SignedSource<<762b0514a4cb89da014ef3f86a950c95>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LlmUsageAggregatePeriod = "day" | "month" | "total" | "%future added value";
export type LlmUsageAggregateScope = "agent" | "company" | "provider" | "session" | "%future added value";
export type SkillType = "custom" | "system" | "%future added value";
export type agentDetailPageQuery$variables = {
  agentId: string;
  dailyStart: string;
  monthlyStart: string;
};
export type agentDetailPageQuery$data = {
  readonly Agent: {
    readonly createdAt: string;
    readonly defaultComputeProvider: string | null | undefined;
    readonly defaultComputeProviderDefinitionId: string | null | undefined;
    readonly defaultComputeProviderDefinitionName: string | null | undefined;
    readonly defaultEnvironmentTemplateId: string;
    readonly environmentTemplate: {
      readonly computerUse: boolean;
      readonly cpuCount: number;
      readonly diskSpaceGb: number;
      readonly memoryGb: number;
      readonly name: string;
      readonly templateId: string;
    };
    readonly id: string;
    readonly modelName: string | null | undefined;
    readonly modelProvider: string | null | undefined;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly modelProviderCredentialModelId: string | null | undefined;
    readonly name: string;
    readonly reasoningLevel: string | null | undefined;
    readonly systemPrompt: string | null | undefined;
    readonly updatedAt: string;
  };
  readonly AgentCreateOptions: ReadonlyArray<{
    readonly defaultModelId: string | null | undefined;
    readonly defaultReasoningLevel: string | null | undefined;
    readonly id: string;
    readonly isDefault: boolean;
    readonly label: string;
    readonly modelProvider: string;
    readonly modelProviderCredentialId: string;
    readonly models: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly modelId: string;
      readonly modelProviderCredentialModelId: string;
      readonly name: string;
      readonly reasoningLevels: ReadonlyArray<string>;
      readonly reasoningSupported: boolean;
    }>;
  }>;
  readonly AgentMcpServers: ReadonlyArray<{
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly url: string;
  }>;
  readonly AgentSecretGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly AgentSecrets: ReadonlyArray<{
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
  }>;
  readonly AgentSkillGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly AgentSkills: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly name: string;
    readonly skillGroupId: string | null | undefined;
    readonly skillType: SkillType;
  }>;
  readonly CompanySettings: {
    readonly baseSystemPrompt: string | null | undefined;
    readonly companyId: string;
  };
  readonly ComputeProviderDefinitions: ReadonlyArray<{
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly provider: string;
    readonly templates: ReadonlyArray<{
      readonly computerUse: boolean;
      readonly cpuCount: number;
      readonly diskSpaceGb: number;
      readonly memoryGb: number;
      readonly name: string;
      readonly templateId: string;
    }>;
  }>;
  readonly McpServers: ReadonlyArray<{
    readonly description: string | null | undefined;
    readonly enabled: boolean;
    readonly id: string;
    readonly name: string;
    readonly url: string;
  }>;
  readonly SecretGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Secrets: ReadonlyArray<{
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly secretGroupId: string | null | undefined;
  }>;
  readonly Sessions: ReadonlyArray<{
    readonly agentId: string;
    readonly associatedTask: {
      readonly id: string;
      readonly name: string;
      readonly status: string;
    } | null | undefined;
    readonly createdAt: string;
    readonly id: string;
    readonly inferredTitle: string | null | undefined;
    readonly lastUserMessageAt: string | null | undefined;
    readonly status: string;
    readonly updatedAt: string;
    readonly userSetTitle: string | null | undefined;
  }>;
  readonly SkillGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Skills: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly name: string;
    readonly skillGroupId: string | null | undefined;
    readonly skillType: SkillType;
  }>;
  readonly agentDaily: ReadonlyArray<{
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
  readonly agentMonthly: ReadonlyArray<{
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
  readonly agentTotal: ReadonlyArray<{
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
export type agentDetailPageQuery = {
  response: agentDetailPageQuery$data;
  variables: agentDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "agentId"
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
  "name": "modelProviderCredentialId",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialModelId",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v6 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "computerUse",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "cpuCount",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "diskSpaceGb",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "memoryGb",
    "storageKey": null
  },
  (v2/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "templateId",
    "storageKey": null
  }
],
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
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
  "args": [
    {
      "kind": "Variable",
      "name": "id",
      "variableName": "agentId"
    }
  ],
  "concreteType": "Agent",
  "kind": "LinkedField",
  "name": "Agent",
  "plural": false,
  "selections": [
    (v1/*: any*/),
    (v2/*: any*/),
    (v3/*: any*/),
    (v4/*: any*/),
    (v5/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "modelName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "defaultComputeProvider",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "defaultComputeProviderDefinitionId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "defaultComputeProviderDefinitionName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "defaultEnvironmentTemplateId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "reasoningLevel",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "systemPrompt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "AgentEnvironmentTemplate",
      "kind": "LinkedField",
      "name": "environmentTemplate",
      "plural": false,
      "selections": (v6/*: any*/),
      "storageKey": null
    },
    (v7/*: any*/),
    (v8/*: any*/)
  ],
  "storageKey": null
},
v10 = {
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
v11 = [
  {
    "kind": "Variable",
    "name": "agentId",
    "variableName": "agentId"
  }
],
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
},
v13 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "envVarName",
  "storageKey": null
},
v14 = {
  "alias": null,
  "args": (v11/*: any*/),
  "concreteType": "Secret",
  "kind": "LinkedField",
  "name": "AgentSecrets",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    (v2/*: any*/),
    (v12/*: any*/),
    (v13/*: any*/)
  ],
  "storageKey": null
},
v15 = [
  (v1/*: any*/),
  (v2/*: any*/)
],
v16 = {
  "alias": null,
  "args": (v11/*: any*/),
  "concreteType": "SecretGroup",
  "kind": "LinkedField",
  "name": "AgentSecretGroups",
  "plural": true,
  "selections": (v15/*: any*/),
  "storageKey": null
},
v17 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "url",
  "storageKey": null
},
v18 = {
  "alias": null,
  "args": (v11/*: any*/),
  "concreteType": "McpServer",
  "kind": "LinkedField",
  "name": "AgentMcpServers",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    (v2/*: any*/),
    (v12/*: any*/),
    (v17/*: any*/)
  ],
  "storageKey": null
},
v19 = {
  "alias": null,
  "args": (v11/*: any*/),
  "concreteType": "SkillGroup",
  "kind": "LinkedField",
  "name": "AgentSkillGroups",
  "plural": true,
  "selections": (v15/*: any*/),
  "storageKey": null
},
v20 = [
  (v1/*: any*/),
  (v2/*: any*/),
  (v12/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "skillGroupId",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "skillType",
    "storageKey": null
  }
],
v21 = {
  "alias": null,
  "args": (v11/*: any*/),
  "concreteType": "Skill",
  "kind": "LinkedField",
  "name": "AgentSkills",
  "plural": true,
  "selections": (v20/*: any*/),
  "storageKey": null
},
v22 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v23 = {
  "alias": null,
  "args": null,
  "concreteType": "Session",
  "kind": "LinkedField",
  "name": "Sessions",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "agentId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "SessionAssociatedTask",
      "kind": "LinkedField",
      "name": "associatedTask",
      "plural": false,
      "selections": [
        (v1/*: any*/),
        (v2/*: any*/),
        (v22/*: any*/)
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "inferredTitle",
      "storageKey": null
    },
    (v22/*: any*/),
    (v7/*: any*/),
    (v8/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "lastUserMessageAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "userSetTitle",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v24 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isDefault",
  "storageKey": null
},
v25 = {
  "alias": null,
  "args": null,
  "concreteType": "AgentCreateProviderOption",
  "kind": "LinkedField",
  "name": "AgentCreateOptions",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    (v3/*: any*/),
    (v24/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "label",
      "storageKey": null
    },
    (v5/*: any*/),
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
      "kind": "ScalarField",
      "name": "defaultReasoningLevel",
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
        (v1/*: any*/),
        (v4/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "modelId",
          "storageKey": null
        },
        (v2/*: any*/),
        (v12/*: any*/),
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
    }
  ],
  "storageKey": null
},
v26 = {
  "alias": null,
  "args": null,
  "concreteType": "Secret",
  "kind": "LinkedField",
  "name": "Secrets",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    (v2/*: any*/),
    (v12/*: any*/),
    (v13/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "secretGroupId",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v27 = {
  "alias": null,
  "args": null,
  "concreteType": "SecretGroup",
  "kind": "LinkedField",
  "name": "SecretGroups",
  "plural": true,
  "selections": (v15/*: any*/),
  "storageKey": null
},
v28 = {
  "alias": null,
  "args": null,
  "concreteType": "McpServer",
  "kind": "LinkedField",
  "name": "McpServers",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    (v2/*: any*/),
    (v12/*: any*/),
    (v17/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "enabled",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v29 = {
  "alias": null,
  "args": null,
  "concreteType": "SkillGroup",
  "kind": "LinkedField",
  "name": "SkillGroups",
  "plural": true,
  "selections": (v15/*: any*/),
  "storageKey": null
},
v30 = {
  "alias": null,
  "args": null,
  "concreteType": "Skill",
  "kind": "LinkedField",
  "name": "Skills",
  "plural": true,
  "selections": (v20/*: any*/),
  "storageKey": null
},
v31 = {
  "alias": null,
  "args": null,
  "concreteType": "ComputeProviderDefinition",
  "kind": "LinkedField",
  "name": "ComputeProviderDefinitions",
  "plural": true,
  "selections": [
    (v1/*: any*/),
    (v24/*: any*/),
    (v2/*: any*/),
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
      "concreteType": "AgentEnvironmentTemplate",
      "kind": "LinkedField",
      "name": "templates",
      "plural": true,
      "selections": (v6/*: any*/),
      "storageKey": null
    }
  ],
  "storageKey": null
},
v32 = {
  "kind": "Variable",
  "name": "scopeId",
  "variableName": "agentId"
},
v33 = {
  "kind": "Literal",
  "name": "scopeType",
  "value": "agent"
},
v34 = [
  {
    "fields": [
      {
        "kind": "Literal",
        "name": "period",
        "value": "total"
      },
      (v32/*: any*/),
      (v33/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v35 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadCostNanoUsd",
  "storageKey": null
},
v36 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheReadTokens",
  "storageKey": null
},
v37 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteCostNanoUsd",
  "storageKey": null
},
v38 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cacheWriteTokens",
  "storageKey": null
},
v39 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputCostNanoUsd",
  "storageKey": null
},
v40 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "inputTokens",
  "storageKey": null
},
v41 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputCostNanoUsd",
  "storageKey": null
},
v42 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "outputTokens",
  "storageKey": null
},
v43 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "period",
  "storageKey": null
},
v44 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "periodStart",
  "storageKey": null
},
v45 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "requestCount",
  "storageKey": null
},
v46 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeId",
  "storageKey": null
},
v47 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "scopeType",
  "storageKey": null
},
v48 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalCostNanoUsd",
  "storageKey": null
},
v49 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "totalTokens",
  "storageKey": null
},
v50 = [
  (v35/*: any*/),
  (v36/*: any*/),
  (v37/*: any*/),
  (v38/*: any*/),
  (v39/*: any*/),
  (v40/*: any*/),
  (v41/*: any*/),
  (v42/*: any*/),
  (v43/*: any*/),
  (v44/*: any*/),
  (v45/*: any*/),
  (v46/*: any*/),
  (v47/*: any*/),
  (v48/*: any*/),
  (v49/*: any*/)
],
v51 = [
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
      (v32/*: any*/),
      (v33/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v52 = [
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
      (v32/*: any*/),
      (v33/*: any*/)
    ],
    "kind": "ObjectValue",
    "name": "input"
  }
],
v53 = [
  (v35/*: any*/),
  (v36/*: any*/),
  (v37/*: any*/),
  (v38/*: any*/),
  (v39/*: any*/),
  (v40/*: any*/),
  (v41/*: any*/),
  (v42/*: any*/),
  (v43/*: any*/),
  (v44/*: any*/),
  (v45/*: any*/),
  (v46/*: any*/),
  (v47/*: any*/),
  (v48/*: any*/),
  (v49/*: any*/),
  (v1/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "agentDetailPageQuery",
    "selections": [
      (v9/*: any*/),
      (v10/*: any*/),
      (v14/*: any*/),
      (v16/*: any*/),
      (v18/*: any*/),
      (v19/*: any*/),
      (v21/*: any*/),
      (v23/*: any*/),
      (v25/*: any*/),
      (v26/*: any*/),
      (v27/*: any*/),
      (v28/*: any*/),
      (v29/*: any*/),
      (v30/*: any*/),
      (v31/*: any*/),
      {
        "alias": "agentTotal",
        "args": (v34/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v50/*: any*/),
        "storageKey": null
      },
      {
        "alias": "agentDaily",
        "args": (v51/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v50/*: any*/),
        "storageKey": null
      },
      {
        "alias": "agentMonthly",
        "args": (v52/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v50/*: any*/),
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
    "name": "agentDetailPageQuery",
    "selections": [
      (v9/*: any*/),
      (v10/*: any*/),
      (v14/*: any*/),
      (v16/*: any*/),
      (v18/*: any*/),
      (v19/*: any*/),
      (v21/*: any*/),
      (v23/*: any*/),
      (v25/*: any*/),
      (v26/*: any*/),
      (v27/*: any*/),
      (v28/*: any*/),
      (v29/*: any*/),
      (v30/*: any*/),
      (v31/*: any*/),
      {
        "alias": "agentTotal",
        "args": (v34/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v53/*: any*/),
        "storageKey": null
      },
      {
        "alias": "agentDaily",
        "args": (v51/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v53/*: any*/),
        "storageKey": null
      },
      {
        "alias": "agentMonthly",
        "args": (v52/*: any*/),
        "concreteType": "LlmUsageAggregate",
        "kind": "LinkedField",
        "name": "LlmUsageAggregates",
        "plural": true,
        "selections": (v53/*: any*/),
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "229d8cff479f5332f511053adb339c8b",
    "id": null,
    "metadata": {},
    "name": "agentDetailPageQuery",
    "operationKind": "query",
    "text": "query agentDetailPageQuery(\n  $agentId: ID!\n  $dailyStart: String!\n  $monthlyStart: String!\n) {\n  Agent(id: $agentId) {\n    id\n    name\n    modelProviderCredentialId\n    modelProviderCredentialModelId\n    modelProvider\n    modelName\n    defaultComputeProvider\n    defaultComputeProviderDefinitionId\n    defaultComputeProviderDefinitionName\n    defaultEnvironmentTemplateId\n    reasoningLevel\n    systemPrompt\n    environmentTemplate {\n      computerUse\n      cpuCount\n      diskSpaceGb\n      memoryGb\n      name\n      templateId\n    }\n    createdAt\n    updatedAt\n  }\n  CompanySettings {\n    companyId\n    baseSystemPrompt\n  }\n  AgentSecrets(agentId: $agentId) {\n    id\n    name\n    description\n    envVarName\n  }\n  AgentSecretGroups(agentId: $agentId) {\n    id\n    name\n  }\n  AgentMcpServers(agentId: $agentId) {\n    id\n    name\n    description\n    url\n  }\n  AgentSkillGroups(agentId: $agentId) {\n    id\n    name\n  }\n  AgentSkills(agentId: $agentId) {\n    id\n    name\n    description\n    skillGroupId\n    skillType\n  }\n  Sessions {\n    id\n    agentId\n    associatedTask {\n      id\n      name\n      status\n    }\n    inferredTitle\n    status\n    createdAt\n    updatedAt\n    lastUserMessageAt\n    userSetTitle\n  }\n  AgentCreateOptions {\n    id\n    modelProviderCredentialId\n    isDefault\n    label\n    modelProvider\n    defaultModelId\n    defaultReasoningLevel\n    models {\n      id\n      modelProviderCredentialModelId\n      modelId\n      name\n      description\n      reasoningSupported\n      reasoningLevels\n    }\n  }\n  Secrets {\n    id\n    name\n    description\n    envVarName\n    secretGroupId\n  }\n  SecretGroups {\n    id\n    name\n  }\n  McpServers {\n    id\n    name\n    description\n    url\n    enabled\n  }\n  SkillGroups {\n    id\n    name\n  }\n  Skills {\n    id\n    name\n    description\n    skillGroupId\n    skillType\n  }\n  ComputeProviderDefinitions {\n    id\n    isDefault\n    name\n    provider\n    templates {\n      computerUse\n      cpuCount\n      diskSpaceGb\n      memoryGb\n      name\n      templateId\n    }\n  }\n  agentTotal: LlmUsageAggregates(input: {scopeType: agent, scopeId: $agentId, period: total}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  agentDaily: LlmUsageAggregates(input: {scopeType: agent, scopeId: $agentId, period: day, periodStartAfter: $dailyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n  agentMonthly: LlmUsageAggregates(input: {scopeType: agent, scopeId: $agentId, period: month, periodStartAfter: $monthlyStart}) {\n    cacheReadCostNanoUsd\n    cacheReadTokens\n    cacheWriteCostNanoUsd\n    cacheWriteTokens\n    inputCostNanoUsd\n    inputTokens\n    outputCostNanoUsd\n    outputTokens\n    period\n    periodStart\n    requestCount\n    scopeId\n    scopeType\n    totalCostNanoUsd\n    totalTokens\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "5c9cbc16b139825be4932c41ffe5f728";

export default node;
