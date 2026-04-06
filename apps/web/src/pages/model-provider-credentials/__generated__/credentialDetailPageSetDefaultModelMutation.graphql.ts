/**
 * @generated SignedSource<<d9a18a60ccfee55c7d56cb616d71330c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetDefaultModelProviderCredentialModelInput = {
  id: string;
};
export type credentialDetailPageSetDefaultModelMutation$variables = {
  input: SetDefaultModelProviderCredentialModelInput;
};
export type credentialDetailPageSetDefaultModelMutation$data = {
  readonly SetDefaultModelProviderCredentialModel: {
    readonly id: string;
    readonly isDefault: boolean;
  };
};
export type credentialDetailPageSetDefaultModelMutation = {
  response: credentialDetailPageSetDefaultModelMutation$data;
  variables: credentialDetailPageSetDefaultModelMutation$variables;
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
    "concreteType": "ModelProviderCredentialModel",
    "kind": "LinkedField",
    "name": "SetDefaultModelProviderCredentialModel",
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
    "name": "credentialDetailPageSetDefaultModelMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageSetDefaultModelMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "bbfbbf0517823a7477819d3853c1418e",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageSetDefaultModelMutation",
    "operationKind": "mutation",
    "text": "mutation credentialDetailPageSetDefaultModelMutation(\n  $input: SetDefaultModelProviderCredentialModelInput!\n) {\n  SetDefaultModelProviderCredentialModel(input: $input) {\n    id\n    isDefault\n  }\n}\n"
  }
};
})();

(node as any).hash = "03d9cb08bcfff8c29bfdf0c4325bc638";

export default node;
