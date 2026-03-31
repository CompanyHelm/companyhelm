/**
 * @generated SignedSource<<6081ae4e67836ac143f189252b09269b>>
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
export type knowledgeBasePageUpdateMarkdownArtifactMutation$variables = {
  input: UpdateMarkdownArtifactInput;
};
export type knowledgeBasePageUpdateMarkdownArtifactMutation$data = {
  readonly UpdateMarkdownArtifact: {
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type knowledgeBasePageUpdateMarkdownArtifactMutation = {
  response: knowledgeBasePageUpdateMarkdownArtifactMutation$data;
  variables: knowledgeBasePageUpdateMarkdownArtifactMutation$variables;
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
    "name": "knowledgeBasePageUpdateMarkdownArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBasePageUpdateMarkdownArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "0ddfe296e79b1b7364f4fa1dd598e7a2",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageUpdateMarkdownArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBasePageUpdateMarkdownArtifactMutation(\n  $input: UpdateMarkdownArtifactInput!\n) {\n  UpdateMarkdownArtifact(input: $input) {\n    id\n    markdownContent\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "5df2d6b591c350bfa0748a870e500629";

export default node;
