/**
 * @generated SignedSource<<bd8e7415038ad1c918239d2d3eff69e5>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetDefaultModelProviderCredentialInput = {
  id: string;
};
export type modelProviderCredentialsPageSetDefaultCredentialMutation$variables = {
  input: SetDefaultModelProviderCredentialInput;
};
export type modelProviderCredentialsPageSetDefaultCredentialMutation$data = {
  readonly SetDefaultModelProviderCredential: {
    readonly id: string;
    readonly isDefault: boolean;
  };
};
export type modelProviderCredentialsPageSetDefaultCredentialMutation = {
  response: modelProviderCredentialsPageSetDefaultCredentialMutation$data;
  variables: modelProviderCredentialsPageSetDefaultCredentialMutation$variables;
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
    "concreteType": "ModelProviderCredential",
    "kind": "LinkedField",
    "name": "SetDefaultModelProviderCredential",
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
    "name": "modelProviderCredentialsPageSetDefaultCredentialMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelProviderCredentialsPageSetDefaultCredentialMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "00aade98467b137fdeb062cfbe7ffd00",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageSetDefaultCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation modelProviderCredentialsPageSetDefaultCredentialMutation(\n  $input: SetDefaultModelProviderCredentialInput!\n) {\n  SetDefaultModelProviderCredential(input: $input) {\n    id\n    isDefault\n  }\n}\n"
  }
};
})();

(node as any).hash = "d8f8c80330539e9221fd190b7484a0a6";

export default node;
