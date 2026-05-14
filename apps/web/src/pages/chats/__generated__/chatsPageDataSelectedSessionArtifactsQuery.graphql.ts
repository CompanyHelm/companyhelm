/**
 * @generated SignedSource<<ae52f7a507c3af76bb1da0e2289314ff>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataSelectedSessionArtifactsQuery$variables = {
  sessionId: string;
};
export type chatsPageDataSelectedSessionArtifactsQuery$data = {
  readonly Artifacts: ReadonlyArray<{
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly name: string;
    readonly pullRequestNumber: number | null | undefined;
    readonly pullRequestProvider: string | null | undefined;
    readonly pullRequestRepository: string | null | undefined;
    readonly scopeType: string;
    readonly sessionId: string | null | undefined;
    readonly state: string;
    readonly taskId: string | null | undefined;
    readonly type: string;
    readonly updatedAt: string;
    readonly url: string | null | undefined;
  }>;
};
export type chatsPageDataSelectedSessionArtifactsQuery = {
  response: chatsPageDataSelectedSessionArtifactsQuery$data;
  variables: chatsPageDataSelectedSessionArtifactsQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "sessionId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "fields": [
          {
            "kind": "Literal",
            "name": "scopeType",
            "value": "session"
          },
          {
            "kind": "Variable",
            "name": "sessionId",
            "variableName": "sessionId"
          }
        ],
        "kind": "ObjectValue",
        "name": "input"
      }
    ],
    "concreteType": "Artifact",
    "kind": "LinkedField",
    "name": "Artifacts",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sessionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "taskId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "scopeType",
        "storageKey": null
      },
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
        "name": "state",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "name",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "markdownContent",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "url",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestProvider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestRepository",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestNumber",
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
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageDataSelectedSessionArtifactsQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataSelectedSessionArtifactsQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "f0eefdbd6e56eea51522b8c84499cf3f",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSelectedSessionArtifactsQuery",
    "operationKind": "query",
    "text": "query chatsPageDataSelectedSessionArtifactsQuery(\n  $sessionId: ID!\n) {\n  Artifacts(input: {scopeType: \"session\", sessionId: $sessionId}) {\n    id\n    sessionId\n    taskId\n    scopeType\n    type\n    state\n    name\n    description\n    markdownContent\n    url\n    pullRequestProvider\n    pullRequestRepository\n    pullRequestNumber\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "0aebc1f8fa7adc294e443026e90e6b87";

export default node;
