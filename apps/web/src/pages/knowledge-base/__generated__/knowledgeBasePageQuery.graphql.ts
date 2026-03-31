/**
 * @generated SignedSource<<805cb3491502b9c52aa183cc950a7dc3>>
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
    readonly description: string | null | undefined;
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly name: string;
    readonly type: string;
    readonly updatedAt: string;
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
        "name": "type",
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
    "cacheID": "04c75057e601e991b68388cd79a49112",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageQuery",
    "operationKind": "query",
    "text": "query knowledgeBasePageQuery {\n  Artifacts(input: {scopeType: \"company\"}) {\n    id\n    type\n    name\n    description\n    markdownContent\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "1c159b6667c14b168a038a61d241660f";

export default node;
