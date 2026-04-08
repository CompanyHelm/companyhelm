/**
 * @generated SignedSource<<3208a949908f152ed5567f277d419965>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type GetEnvironmentVncUrlInput = {
  id: string;
};
export type chatsPageGetEnvironmentVncUrlMutation$variables = {
  input: GetEnvironmentVncUrlInput;
};
export type chatsPageGetEnvironmentVncUrlMutation$data = {
  readonly GetEnvironmentVncUrl: {
    readonly environmentId: string;
    readonly url: string;
  };
};
export type chatsPageGetEnvironmentVncUrlMutation = {
  response: chatsPageGetEnvironmentVncUrlMutation$data;
  variables: chatsPageGetEnvironmentVncUrlMutation$variables;
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
    "concreteType": "EnvironmentVncUrl",
    "kind": "LinkedField",
    "name": "GetEnvironmentVncUrl",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "environmentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "url",
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
    "name": "chatsPageGetEnvironmentVncUrlMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageGetEnvironmentVncUrlMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "3c3a25e0b8174e88c94b1564c6b590aa",
    "id": null,
    "metadata": {},
    "name": "chatsPageGetEnvironmentVncUrlMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageGetEnvironmentVncUrlMutation(\n  $input: GetEnvironmentVncUrlInput!\n) {\n  GetEnvironmentVncUrl(input: $input) {\n    environmentId\n    url\n  }\n}\n"
  }
};
})();

(node as any).hash = "56c1359596c68fd6e34daa2897f9faf7";

export default node;
