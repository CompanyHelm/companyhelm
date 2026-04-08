/**
 * @generated SignedSource<<c0fd7c75bda2bb4a73a799d95b97122f>>
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
export type environmentsPageGetEnvironmentVncUrlMutation$variables = {
  input: GetEnvironmentVncUrlInput;
};
export type environmentsPageGetEnvironmentVncUrlMutation$data = {
  readonly GetEnvironmentVncUrl: {
    readonly environmentId: string;
    readonly url: string;
  };
};
export type environmentsPageGetEnvironmentVncUrlMutation = {
  response: environmentsPageGetEnvironmentVncUrlMutation$data;
  variables: environmentsPageGetEnvironmentVncUrlMutation$variables;
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
    "name": "environmentsPageGetEnvironmentVncUrlMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentsPageGetEnvironmentVncUrlMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7cb2756b3767faa598f8c5413c0aa293",
    "id": null,
    "metadata": {},
    "name": "environmentsPageGetEnvironmentVncUrlMutation",
    "operationKind": "mutation",
    "text": "mutation environmentsPageGetEnvironmentVncUrlMutation(\n  $input: GetEnvironmentVncUrlInput!\n) {\n  GetEnvironmentVncUrl(input: $input) {\n    environmentId\n    url\n  }\n}\n"
  }
};
})();

(node as any).hash = "bed78b10d2a478b6d1accce812ca7553";

export default node;
