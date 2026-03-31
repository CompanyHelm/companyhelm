/**
 * @generated SignedSource<<f7c743292f9a3dfa359747943558e43c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageSessionEnvironmentQuery$variables = {
  sessionId: string;
};
export type chatsPageSessionEnvironmentQuery$data = {
  readonly SessionEnvironment: {
    readonly agentDefaultComputeProviderDefinition: {
      readonly id: string;
      readonly name: string;
      readonly provider: string;
    } | null | undefined;
    readonly currentEnvironment: {
      readonly cpuCount: number;
      readonly diskSpaceGb: number;
      readonly displayName: string | null | undefined;
      readonly id: string;
      readonly memoryGb: number;
      readonly platform: string;
      readonly provider: string;
      readonly providerDefinitionName: string | null | undefined;
      readonly providerEnvironmentId: string;
      readonly status: string;
    } | null | undefined;
  };
};
export type chatsPageSessionEnvironmentQuery = {
  response: chatsPageSessionEnvironmentQuery$data;
  variables: chatsPageSessionEnvironmentQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "sessionId"
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
  "name": "provider",
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "sessionId",
        "variableName": "sessionId"
      }
    ],
    "concreteType": "SessionEnvironmentInfo",
    "kind": "LinkedField",
    "name": "SessionEnvironment",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Environment",
        "kind": "LinkedField",
        "name": "currentEnvironment",
        "plural": false,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "displayName",
            "storageKey": null
          },
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "providerDefinitionName",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "providerEnvironmentId",
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
            "name": "platform",
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
            "name": "memoryGb",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "diskSpaceGb",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "ComputeProviderDefinition",
        "kind": "LinkedField",
        "name": "agentDefaultComputeProviderDefinition",
        "plural": false,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "name",
            "storageKey": null
          },
          (v2/*: any*/)
        ],
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
    "name": "chatsPageSessionEnvironmentQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageSessionEnvironmentQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "8865f88e70655b5e4b6b4d6b5c395f62",
    "id": null,
    "metadata": {},
    "name": "chatsPageSessionEnvironmentQuery",
    "operationKind": "query",
    "text": "query chatsPageSessionEnvironmentQuery(\n  $sessionId: ID!\n) {\n  SessionEnvironment(sessionId: $sessionId) {\n    currentEnvironment {\n      id\n      displayName\n      provider\n      providerDefinitionName\n      providerEnvironmentId\n      status\n      platform\n      cpuCount\n      memoryGb\n      diskSpaceGb\n    }\n    agentDefaultComputeProviderDefinition {\n      id\n      name\n      provider\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "447d48cd22dfd2a1bf617a7268687931";

export default node;
