/**
 * @generated SignedSource<<3f0539347b49c62fd2028f3d3a3516d0>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteModelProviderCredentialInput = {
  id: string;
  replacementCredentialId?: string | null | undefined;
};
export type modelProviderCredentialsPageDeleteCredentialMutation$variables = {
  input: DeleteModelProviderCredentialInput;
};
export type modelProviderCredentialsPageDeleteCredentialMutation$data = {
  readonly DeleteModelProviderCredential: {
    readonly id: string;
  };
};
export type modelProviderCredentialsPageDeleteCredentialMutation = {
  response: modelProviderCredentialsPageDeleteCredentialMutation$data;
  variables: modelProviderCredentialsPageDeleteCredentialMutation$variables;
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
    "name": "DeleteModelProviderCredential",
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
    "name": "modelProviderCredentialsPageDeleteCredentialMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelProviderCredentialsPageDeleteCredentialMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "74c89821a340b38bba532c0c701b53ba",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageDeleteCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation modelProviderCredentialsPageDeleteCredentialMutation(\n  $input: DeleteModelProviderCredentialInput!\n) {\n  DeleteModelProviderCredential(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "0d0cc02410529f4466b4cf9c44ea9fc6";

export default node;
