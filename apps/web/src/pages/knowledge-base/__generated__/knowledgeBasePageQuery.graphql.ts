/**
 * @generated SignedSource<<3268c8f80f0a4f4a07ddf1a08bfb8267>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type knowledgeBasePageQuery$variables = Record<PropertyKey, never>;
export type knowledgeBasePageQuery$data = {
  readonly Artifacts: ReadonlyArray<{
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly name: string;
    readonly scopeType: string;
    readonly state: string;
    readonly taskId: string | null | undefined;
    readonly type: string;
    readonly updatedAt: string;
    readonly url: string | null | undefined;
  }>;
};
export type knowledgeBasePageQuery = {
  response: knowledgeBasePageQuery$data;
  variables: knowledgeBasePageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Literal",
        "name": "input",
        "value": {
          "scopeType": "company"
        }
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
    "storageKey": "Artifacts(input:{\"scopeType\":\"company\"})"
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "knowledgeBasePageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "knowledgeBasePageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "743ad9679a41b55b1eaeadc0b9d98b38",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageQuery",
    "operationKind": "query",
    "text": "query knowledgeBasePageQuery {\n  Artifacts(input: {scopeType: \"company\"}) {\n    id\n    taskId\n    scopeType\n    type\n    state\n    name\n    description\n    markdownContent\n    url\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "641f5396acad18a4b2f1027596f13450";

export default node;
