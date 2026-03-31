/**
 * @generated SignedSource<<0ddd730c289332487c491ed10e5ca642>>
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
    readonly environmentRequirements: {
      readonly minCpuCount: number;
      readonly minDiskSpaceGb: number;
      readonly minMemoryGb: number;
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
    readonly label: string;
    readonly modelProvider: string;
    readonly models: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly modelId: string;
      readonly name: string;
      readonly reasoningLevels: ReadonlyArray<string>;
    }>;
  }>;
  readonly AgentSecrets: ReadonlyArray<{
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
  }>;
  readonly Secrets: ReadonlyArray<{
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
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
  "name": "modelProvider",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
},
v5 = [
  (v1/*: any*/),
  (v2/*: any*/),
  (v4/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "envVarName",
    "storageKey": null
  }
],
v6 = [
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
        "kind": "ScalarField",
        "name": "modelProviderCredentialModelId",
        "storageKey": null
      },
      (v3/*: any*/),
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
        "concreteType": "AgentEnvironmentRequirements",
        "kind": "LinkedField",
        "name": "environmentRequirements",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "minCpuCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "minMemoryGb",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "minDiskSpaceGb",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
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
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "agentId",
        "variableName": "agentId"
      }
    ],
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "AgentSecrets",
    "plural": true,
    "selections": (v5/*: any*/),
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
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "label",
        "storageKey": null
      },
      (v3/*: any*/),
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
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "modelId",
            "storageKey": null
          },
          (v2/*: any*/),
          (v4/*: any*/),
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
    "selections": (v5/*: any*/),
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "agentDetailPageQuery",
    "selections": (v6/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentDetailPageQuery",
    "selections": (v6/*: any*/)
  },
  "params": {
    "cacheID": "77131fd6ea5fcbc604f4922c24b42f2f",
    "id": null,
    "metadata": {},
    "name": "agentDetailPageQuery",
    "operationKind": "query",
    "text": "query agentDetailPageQuery(\n  $agentId: ID!\n) {\n  Agent(id: $agentId) {\n    id\n    name\n    modelProviderCredentialId\n    modelProviderCredentialModelId\n    modelProvider\n    modelName\n    reasoningLevel\n    systemPrompt\n    environmentRequirements {\n      minCpuCount\n      minMemoryGb\n      minDiskSpaceGb\n    }\n    createdAt\n    updatedAt\n  }\n  AgentSecrets(agentId: $agentId) {\n    id\n    name\n    description\n    envVarName\n  }\n  AgentCreateOptions {\n    id\n    label\n    modelProvider\n    defaultModelId\n    defaultReasoningLevel\n    models {\n      id\n      modelId\n      name\n      description\n      reasoningLevels\n    }\n  }\n  Secrets {\n    id\n    name\n    description\n    envVarName\n  }\n}\n"
  }
};
})();

(node as any).hash = "4bbaf5d545c35d2bc8fb3b4e2abc9e46";

export default node;
