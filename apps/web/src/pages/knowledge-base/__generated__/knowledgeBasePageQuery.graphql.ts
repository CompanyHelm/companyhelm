/**
 * @generated SignedSource<<62ebc6630cb8269ad15a2bc971784993>>
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
    readonly state: string;
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
        "name": "state",
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
    "cacheID": "276600a4db1978ec2218be5fd205cfb2",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageQuery",
    "operationKind": "query",
    "text": "query knowledgeBasePageQuery {\n  Artifacts(input: {scopeType: \"company\"}) {\n    id\n    state\n    type\n    name\n    description\n    markdownContent\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4e5580618e463a54acb840d43f7b3238";

export default node;
