/**
 * @generated SignedSource<<19e43656d5d34c2b9784a762a3e68cb5>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteArtifactInput = {
  id: string;
};
export type knowledgeBasePageDeleteArtifactMutation$variables = {
  input: DeleteArtifactInput;
};
export type knowledgeBasePageDeleteArtifactMutation$data = {
  readonly DeleteArtifact: {
    readonly id: string;
  };
};
export type knowledgeBasePageDeleteArtifactMutation = {
  response: knowledgeBasePageDeleteArtifactMutation$data;
  variables: knowledgeBasePageDeleteArtifactMutation$variables;
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
    "name": "DeleteArtifact",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
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
    "name": "knowledgeBasePageDeleteArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBasePageDeleteArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "ebfdf10b3097c1e51defad4482010bee",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageDeleteArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBasePageDeleteArtifactMutation(\n  $input: DeleteArtifactInput!\n) {\n  DeleteArtifact(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "1f98234b8639a7c21350c5331572fb37";

export default node;
