/**
 * @generated SignedSource<<0368a9c956d64e80c4261111be6687a7>>
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
export type knowledgeBaseDetailPageUpdateArtifactMutation$variables = {
  input: UpdateArtifactInput;
};
export type knowledgeBaseDetailPageUpdateArtifactMutation$data = {
  readonly UpdateArtifact: {
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
  };
};
export type knowledgeBaseDetailPageUpdateArtifactMutation = {
  response: knowledgeBaseDetailPageUpdateArtifactMutation$data;
  variables: knowledgeBaseDetailPageUpdateArtifactMutation$variables;
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
    "name": "knowledgeBaseDetailPageUpdateArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBaseDetailPageUpdateArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "9d852cd7db89ffd74a3d4af77447ca87",
    "id": null,
    "metadata": {},
    "name": "knowledgeBaseDetailPageUpdateArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBaseDetailPageUpdateArtifactMutation(\n  $input: UpdateArtifactInput!\n) {\n  UpdateArtifact(input: $input) {\n    id\n    name\n    description\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "55d5586a6692e95612079fc4e53cf903";

export default node;
