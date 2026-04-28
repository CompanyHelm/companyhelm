/**
 * @generated SignedSource<<294f0738edb0c1dc15971e134df8220b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeletePlatformModelInput = {
  id: string;
  replacementPlatformModelId?: string | null | undefined;
};
export type modelsPageDeleteMutation$variables = {
  input: DeletePlatformModelInput;
};
export type modelsPageDeleteMutation$data = {
  readonly DeletePlatformModel: {
    readonly id: string;
  };
};
export type modelsPageDeleteMutation = {
  response: modelsPageDeleteMutation$data;
  variables: modelsPageDeleteMutation$variables;
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
    "concreteType": "PlatformModel",
    "kind": "LinkedField",
    "name": "DeletePlatformModel",
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
    "name": "modelsPageDeleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelsPageDeleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b15484b9b678629f43255bcc446653cd",
    "id": null,
    "metadata": {},
    "name": "modelsPageDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation modelsPageDeleteMutation(\n  $input: DeletePlatformModelInput!\n) {\n  DeletePlatformModel(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "13a2a4cf800221a8754bdc546d153b53";

export default node;
