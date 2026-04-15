/**
 * @generated SignedSource<<76078b923335b1ae019279bb94ff15a6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataSessionEnvironmentQuery$variables = {
  sessionId: string;
};
export type chatsPageDataSessionEnvironmentQuery$data = {
  readonly SessionEnvironment: {
    readonly activeSkills: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly name: string;
    }>;
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
export type chatsPageDataSessionEnvironmentQuery = {
  response: chatsPageDataSessionEnvironmentQuery$data;
  variables: chatsPageDataSessionEnvironmentQuery$variables;
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
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
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
        "concreteType": "Skill",
        "kind": "LinkedField",
        "name": "activeSkills",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          (v3/*: any*/),
          (v4/*: any*/)
        ],
        "storageKey": null
      },
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
          (v3/*: any*/),
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
    "name": "chatsPageDataSessionEnvironmentQuery",
    "selections": (v5/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataSessionEnvironmentQuery",
    "selections": (v5/*: any*/)
  },
  "params": {
    "cacheID": "a753db3142b2e61368d45844811e5b4d",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSessionEnvironmentQuery",
    "operationKind": "query",
    "text": "query chatsPageDataSessionEnvironmentQuery(\n  $sessionId: ID!\n) {\n  SessionEnvironment(sessionId: $sessionId) {\n    activeSkills {\n      id\n      name\n      description\n    }\n    currentEnvironment {\n      id\n      displayName\n      provider\n      providerDefinitionName\n      providerEnvironmentId\n      status\n      platform\n      cpuCount\n      memoryGb\n      diskSpaceGb\n    }\n    agentDefaultComputeProviderDefinition {\n      id\n      name\n      provider\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "bc6a7f4075bb96cf9f8907cd77f7f9cb";

export default node;
