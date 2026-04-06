/**
 * @generated SignedSource<<ed1368e414a8c343c965ba9f707d6d48>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetDefaultComputeProviderDefinitionInput = {
  id: string;
};
export type computeProviderDefinitionsPageSetDefaultMutation$variables = {
  input: SetDefaultComputeProviderDefinitionInput;
};
export type computeProviderDefinitionsPageSetDefaultMutation$data = {
  readonly SetDefaultComputeProviderDefinition: {
    readonly id: string;
    readonly isDefault: boolean;
  };
};
export type computeProviderDefinitionsPageSetDefaultMutation = {
  response: computeProviderDefinitionsPageSetDefaultMutation$data;
  variables: computeProviderDefinitionsPageSetDefaultMutation$variables;
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
    "name": "SetDefaultComputeProviderDefinition",
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
        "name": "isDefault",
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
    "name": "computeProviderDefinitionsPageSetDefaultMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "computeProviderDefinitionsPageSetDefaultMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "ca648b9b0a7856afc46f1654b71e6f49",
    "id": null,
    "metadata": {},
    "name": "computeProviderDefinitionsPageSetDefaultMutation",
    "operationKind": "mutation",
    "text": "mutation computeProviderDefinitionsPageSetDefaultMutation(\n  $input: SetDefaultComputeProviderDefinitionInput!\n) {\n  SetDefaultComputeProviderDefinition(input: $input) {\n    id\n    isDefault\n  }\n}\n"
  }
};
})();

(node as any).hash = "5f971ee71f3366d3173b47c1fd6292a3";

export default node;
