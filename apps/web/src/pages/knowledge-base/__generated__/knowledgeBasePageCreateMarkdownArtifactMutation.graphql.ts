/**
 * @generated SignedSource<<45afe6673677614c03900f5786423559>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateMarkdownArtifactInput = {
  contentMarkdown: string;
  description?: string | null | undefined;
  name: string;
  scopeType: string;
  state?: string | null | undefined;
  taskId?: string | null | undefined;
};
export type knowledgeBasePageCreateMarkdownArtifactMutation$variables = {
  input: CreateMarkdownArtifactInput;
};
export type knowledgeBasePageCreateMarkdownArtifactMutation$data = {
  readonly CreateMarkdownArtifact: {
    readonly description: string | null | undefined;
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly name: string;
    readonly type: string;
    readonly updatedAt: string;
  };
};
export type knowledgeBasePageCreateMarkdownArtifactMutation = {
  response: knowledgeBasePageCreateMarkdownArtifactMutation$data;
  variables: knowledgeBasePageCreateMarkdownArtifactMutation$variables;
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
    "name": "CreateMarkdownArtifact",
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
    "name": "knowledgeBasePageCreateMarkdownArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBasePageCreateMarkdownArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2fd773714821a690c4d48159d1acccc8",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageCreateMarkdownArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBasePageCreateMarkdownArtifactMutation(\n  $input: CreateMarkdownArtifactInput!\n) {\n  CreateMarkdownArtifact(input: $input) {\n    id\n    type\n    name\n    description\n    markdownContent\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "47ae4982d448aed3c9a155981937f1d3";

export default node;
