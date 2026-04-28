/**
 * @generated SignedSource<<39867493d6c8e293f84461eb05d9fdf4>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type modelProviderCredentialsPageSetDefaultManagedCredentialMutation$variables = Record<PropertyKey, never>;
export type modelProviderCredentialsPageSetDefaultManagedCredentialMutation$data = {
  readonly SetDefaultManagedModelProviderCredential: boolean;
};
export type modelProviderCredentialsPageSetDefaultManagedCredentialMutation = {
  response: modelProviderCredentialsPageSetDefaultManagedCredentialMutation$data;
  variables: modelProviderCredentialsPageSetDefaultManagedCredentialMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "SetDefaultManagedModelProviderCredential",
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "modelProviderCredentialsPageSetDefaultManagedCredentialMutation",
    "selections": (v0/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "modelProviderCredentialsPageSetDefaultManagedCredentialMutation",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "ff36cb98775b1ed021159ce967b60f12",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageSetDefaultManagedCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation modelProviderCredentialsPageSetDefaultManagedCredentialMutation {\n  SetDefaultManagedModelProviderCredential\n}\n"
  }
};
})();

(node as any).hash = "3040f16e0e8d513d496c1cf8f13b9f0d";

export default node;
