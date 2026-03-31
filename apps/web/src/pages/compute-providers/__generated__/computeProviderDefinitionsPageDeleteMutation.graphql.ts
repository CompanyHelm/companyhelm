/**
 * @generated SignedSource<<5f0da299f86a7cf4efbf6272b4bd4623>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteComputeProviderDefinitionInput = {
  id: string;
};
export type computeProviderDefinitionsPageDeleteMutation$variables = {
  input: DeleteComputeProviderDefinitionInput;
};
export type computeProviderDefinitionsPageDeleteMutation$data = {
  readonly DeleteComputeProviderDefinition: {
    readonly id: string;
  };
};
export type computeProviderDefinitionsPageDeleteMutation = {
  response: computeProviderDefinitionsPageDeleteMutation$data;
  variables: computeProviderDefinitionsPageDeleteMutation$variables;
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
    "concreteType": "ComputeProviderDefinition",
    "kind": "LinkedField",
    "name": "DeleteComputeProviderDefinition",
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
    "name": "computeProviderDefinitionsPageDeleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "computeProviderDefinitionsPageDeleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "06f6dc61c519b884ce68f18e48b7b513",
    "id": null,
    "metadata": {},
    "name": "computeProviderDefinitionsPageDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation computeProviderDefinitionsPageDeleteMutation(\n  $input: DeleteComputeProviderDefinitionInput!\n) {\n  DeleteComputeProviderDefinition(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "61c73f0bae3fe38e6648654c0056ad2d";

export default node;
