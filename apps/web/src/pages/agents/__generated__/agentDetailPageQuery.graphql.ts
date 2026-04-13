/**
 * @generated SignedSource<<8692660b6095d64aa41d7bfde80b81df>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type agentDetailPageQuery$variables = {
  agentId: string;
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
  readonly Secrets: ReadonlyArray<{
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
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
v9 = [
  {
    "kind": "Variable",
    "name": "agentId",
    "variableName": "agentId"
  }
],
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
},
v11 = [
  (v1/*: any*/),
  (v2/*: any*/),
  (v10/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "envVarName",
    "storageKey": null
  }
],
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "url",
  "storageKey": null
},
v13 = [
  (v1/*: any*/),
  (v2/*: any*/)
],
v14 = [
  (v1/*: any*/),
  (v2/*: any*/),
  (v10/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "skillGroupId",
    "storageKey": null
  }
],
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v16 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isDefault",
  "storageKey": null
},
v17 = [
  {
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
  {
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
  {
    "alias": null,
    "args": (v9/*: any*/),
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "AgentSecrets",
    "plural": true,
    "selections": (v11/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": (v9/*: any*/),
    "concreteType": "McpServer",
    "kind": "LinkedField",
    "name": "AgentMcpServers",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v10/*: any*/),
      (v12/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": (v9/*: any*/),
    "concreteType": "SkillGroup",
    "kind": "LinkedField",
    "name": "AgentSkillGroups",
    "plural": true,
    "selections": (v13/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": (v9/*: any*/),
    "concreteType": "Skill",
    "kind": "LinkedField",
    "name": "AgentSkills",
    "plural": true,
    "selections": (v14/*: any*/),
    "storageKey": null
  },
  {
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
          (v15/*: any*/)
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
      (v15/*: any*/),
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
  {
    "alias": null,
    "args": null,
    "concreteType": "AgentCreateProviderOption",
    "kind": "LinkedField",
    "name": "AgentCreateOptions",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v3/*: any*/),
      (v16/*: any*/),
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
          (v10/*: any*/),
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
  {
    "alias": null,
    "args": null,
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "Secrets",
    "plural": true,
    "selections": (v11/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "McpServer",
    "kind": "LinkedField",
    "name": "McpServers",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v10/*: any*/),
      (v12/*: any*/),
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
  {
    "alias": null,
    "args": null,
    "concreteType": "SkillGroup",
    "kind": "LinkedField",
    "name": "SkillGroups",
    "plural": true,
    "selections": (v13/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Skill",
    "kind": "LinkedField",
    "name": "Skills",
    "plural": true,
    "selections": (v14/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "ComputeProviderDefinition",
    "kind": "LinkedField",
    "name": "ComputeProviderDefinitions",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v16/*: any*/),
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
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "agentDetailPageQuery",
    "selections": (v17/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentDetailPageQuery",
    "selections": (v17/*: any*/)
  },
  "params": {
    "cacheID": "0a8377544e580bc0783dd8a896da98bc",
    "id": null,
    "metadata": {},
    "name": "agentDetailPageQuery",
    "operationKind": "query",
    "text": "query agentDetailPageQuery(\n  $agentId: ID!\n) {\n  Agent(id: $agentId) {\n    id\n    name\n    modelProviderCredentialId\n    modelProviderCredentialModelId\n    modelProvider\n    modelName\n    defaultComputeProvider\n    defaultComputeProviderDefinitionId\n    defaultComputeProviderDefinitionName\n    defaultEnvironmentTemplateId\n    reasoningLevel\n    systemPrompt\n    environmentTemplate {\n      computerUse\n      cpuCount\n      diskSpaceGb\n      memoryGb\n      name\n      templateId\n    }\n    createdAt\n    updatedAt\n  }\n  CompanySettings {\n    companyId\n    baseSystemPrompt\n  }\n  AgentSecrets(agentId: $agentId) {\n    id\n    name\n    description\n    envVarName\n  }\n  AgentMcpServers(agentId: $agentId) {\n    id\n    name\n    description\n    url\n  }\n  AgentSkillGroups(agentId: $agentId) {\n    id\n    name\n  }\n  AgentSkills(agentId: $agentId) {\n    id\n    name\n    description\n    skillGroupId\n  }\n  Sessions {\n    id\n    agentId\n    associatedTask {\n      id\n      name\n      status\n    }\n    inferredTitle\n    status\n    createdAt\n    updatedAt\n    lastUserMessageAt\n    userSetTitle\n  }\n  AgentCreateOptions {\n    id\n    modelProviderCredentialId\n    isDefault\n    label\n    modelProvider\n    defaultModelId\n    defaultReasoningLevel\n    models {\n      id\n      modelProviderCredentialModelId\n      modelId\n      name\n      description\n      reasoningSupported\n      reasoningLevels\n    }\n  }\n  Secrets {\n    id\n    name\n    description\n    envVarName\n  }\n  McpServers {\n    id\n    name\n    description\n    url\n    enabled\n  }\n  SkillGroups {\n    id\n    name\n  }\n  Skills {\n    id\n    name\n    description\n    skillGroupId\n  }\n  ComputeProviderDefinitions {\n    id\n    isDefault\n    name\n    provider\n    templates {\n      computerUse\n      cpuCount\n      diskSpaceGb\n      memoryGb\n      name\n      templateId\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "766b09a66ea3c094af94e36bee9fddb9";

export default node;
