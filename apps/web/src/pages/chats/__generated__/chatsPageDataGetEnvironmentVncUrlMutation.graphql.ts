/**
 * @generated SignedSource<<88e59c5972662f7238470b6b8cab9b4c>>
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
export type chatsPageDataGetEnvironmentVncUrlMutation$variables = {
  input: GetEnvironmentVncUrlInput;
};
export type chatsPageDataGetEnvironmentVncUrlMutation$data = {
  readonly GetEnvironmentVncUrl: {
    readonly url: string;
  };
};
export type chatsPageDataGetEnvironmentVncUrlMutation = {
  response: chatsPageDataGetEnvironmentVncUrlMutation$data;
  variables: chatsPageDataGetEnvironmentVncUrlMutation$variables;
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
    "name": "chatsPageDataGetEnvironmentVncUrlMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataGetEnvironmentVncUrlMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "9659a955cc3a09c5d533b4148f2a5b71",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataGetEnvironmentVncUrlMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataGetEnvironmentVncUrlMutation(\n  $input: GetEnvironmentVncUrlInput!\n) {\n  GetEnvironmentVncUrl(input: $input) {\n    url\n  }\n}\n"
  }
};
})();

(node as any).hash = "70c6a1de4a602d949927becef6912fa6";

export default node;
