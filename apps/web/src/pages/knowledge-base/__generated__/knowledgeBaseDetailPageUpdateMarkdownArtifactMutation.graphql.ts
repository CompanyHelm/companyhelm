/**
 * @generated SignedSource<<5e2f9678cb0041cf8b28b23be135d673>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateMarkdownArtifactInput = {
  contentMarkdown: string;
  id: string;
};
export type knowledgeBaseDetailPageUpdateMarkdownArtifactMutation$variables = {
  input: UpdateMarkdownArtifactInput;
};
export type knowledgeBaseDetailPageUpdateMarkdownArtifactMutation$data = {
  readonly UpdateMarkdownArtifact: {
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type knowledgeBaseDetailPageUpdateMarkdownArtifactMutation = {
  response: knowledgeBaseDetailPageUpdateMarkdownArtifactMutation$data;
  variables: knowledgeBaseDetailPageUpdateMarkdownArtifactMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "Artifact",
    "kind": "LinkedField",
    "name": "UpdateMarkdownArtifact",
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
    "name": "knowledgeBaseDetailPageUpdateMarkdownArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBaseDetailPageUpdateMarkdownArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "4ed23eef71736d4a7538fb35fba7a65b",
    "id": null,
    "metadata": {},
    "name": "knowledgeBaseDetailPageUpdateMarkdownArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBaseDetailPageUpdateMarkdownArtifactMutation(\n  $input: UpdateMarkdownArtifactInput!\n) {\n  UpdateMarkdownArtifact(input: $input) {\n    id\n    markdownContent\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "2482056f8f1568023bda823464dcc1ef";

export default node;
