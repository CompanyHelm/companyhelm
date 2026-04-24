/**
 * @generated SignedSource<<d190d39d71020f1309507feba184d812>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetDefaultImageProviderCredentialModelInput = {
  id: string;
};
export type credentialDetailPageSetDefaultImageModelMutation$variables = {
  input: SetDefaultImageProviderCredentialModelInput;
};
export type credentialDetailPageSetDefaultImageModelMutation$data = {
  readonly SetDefaultImageProviderCredentialModel: {
    readonly id: string;
    readonly isDefault: boolean;
  };
};
export type credentialDetailPageSetDefaultImageModelMutation = {
  response: credentialDetailPageSetDefaultImageModelMutation$data;
  variables: credentialDetailPageSetDefaultImageModelMutation$variables;
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
    "concreteType": "ImageProviderCredentialModel",
    "kind": "LinkedField",
    "name": "SetDefaultImageProviderCredentialModel",
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
    "name": "credentialDetailPageSetDefaultImageModelMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageSetDefaultImageModelMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b7ada517070689b36181d77d33c217d2",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageSetDefaultImageModelMutation",
    "operationKind": "mutation",
    "text": "mutation credentialDetailPageSetDefaultImageModelMutation(\n  $input: SetDefaultImageProviderCredentialModelInput!\n) {\n  SetDefaultImageProviderCredentialModel(input: $input) {\n    id\n    isDefault\n  }\n}\n"
  }
};
})();

(node as any).hash = "9832c2c40553600fa5573336893ca0ac";

export default node;
