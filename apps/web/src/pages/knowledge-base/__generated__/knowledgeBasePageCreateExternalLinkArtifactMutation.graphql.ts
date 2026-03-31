/**
 * @generated SignedSource<<dd7c3baf49cc8df68d0110bb44c368b4>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateExternalLinkArtifactInput = {
  description?: string | null | undefined;
  name: string;
  scopeType: string;
  state?: string | null | undefined;
  taskId?: string | null | undefined;
  url: string;
};
export type knowledgeBasePageCreateExternalLinkArtifactMutation$variables = {
  input: CreateExternalLinkArtifactInput;
};
export type knowledgeBasePageCreateExternalLinkArtifactMutation$data = {
  readonly CreateExternalLinkArtifact: {
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly type: string;
    readonly updatedAt: string;
    readonly url: string | null | undefined;
  };
};
export type knowledgeBasePageCreateExternalLinkArtifactMutation = {
  response: knowledgeBasePageCreateExternalLinkArtifactMutation$data;
  variables: knowledgeBasePageCreateExternalLinkArtifactMutation$variables;
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
    "name": "CreateExternalLinkArtifact",
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
        "name": "url",
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
    "name": "knowledgeBasePageCreateExternalLinkArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBasePageCreateExternalLinkArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "146a7a5815cc6b35a14260895a5915a8",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageCreateExternalLinkArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBasePageCreateExternalLinkArtifactMutation(\n  $input: CreateExternalLinkArtifactInput!\n) {\n  CreateExternalLinkArtifact(input: $input) {\n    id\n    type\n    name\n    description\n    url\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "cdabdabfa51293d39569cf069980eef3";

export default node;
