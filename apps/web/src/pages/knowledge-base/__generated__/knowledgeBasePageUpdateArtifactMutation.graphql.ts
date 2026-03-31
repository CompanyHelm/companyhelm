/**
 * @generated SignedSource<<e7d79333d9a55b8d362f387b1a3cf8c2>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateArtifactInput = {
  description?: string | null | undefined;
  id: string;
  name?: string | null | undefined;
  state?: string | null | undefined;
};
export type knowledgeBasePageUpdateArtifactMutation$variables = {
  input: UpdateArtifactInput;
};
export type knowledgeBasePageUpdateArtifactMutation$data = {
  readonly UpdateArtifact: {
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
  };
};
export type knowledgeBasePageUpdateArtifactMutation = {
  response: knowledgeBasePageUpdateArtifactMutation$data;
  variables: knowledgeBasePageUpdateArtifactMutation$variables;
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
    "name": "UpdateArtifact",
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
    "name": "knowledgeBasePageUpdateArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBasePageUpdateArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "0c60a408a6d1d5a8e662bfad0f38b019",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageUpdateArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBasePageUpdateArtifactMutation(\n  $input: UpdateArtifactInput!\n) {\n  UpdateArtifact(input: $input) {\n    id\n    name\n    description\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "5396893291a945c0b6fa145788c47803";

export default node;
