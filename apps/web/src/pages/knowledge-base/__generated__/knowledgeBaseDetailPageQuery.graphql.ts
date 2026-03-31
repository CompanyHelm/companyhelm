/**
 * @generated SignedSource<<c802826167e329eedf230b0fd4247962>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type knowledgeBaseDetailPageQuery$variables = {
  artifactId: string;
};
export type knowledgeBaseDetailPageQuery$data = {
  readonly Artifact: {
    readonly description: string | null | undefined;
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly name: string;
    readonly type: string;
    readonly updatedAt: string;
  };
};
export type knowledgeBaseDetailPageQuery = {
  response: knowledgeBaseDetailPageQuery$data;
  variables: knowledgeBaseDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "artifactId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "artifactId"
      }
    ],
    "concreteType": "Artifact",
    "kind": "LinkedField",
    "name": "Artifact",
    "plural": false,
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
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "knowledgeBaseDetailPageQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBaseDetailPageQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b5fe2f8efbdfe5a70698e33e3308ec60",
    "id": null,
    "metadata": {},
    "name": "knowledgeBaseDetailPageQuery",
    "operationKind": "query",
    "text": "query knowledgeBaseDetailPageQuery(\n  $artifactId: ID!\n) {\n  Artifact(id: $artifactId) {\n    id\n    type\n    name\n    description\n    markdownContent\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "5044dfc9cfb1a5fd56d91e382fb74aae";

export default node;
