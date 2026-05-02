/**
 * @generated SignedSource<<15fc891b9c31e570877457738925e91b>>
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
export type environmentActionMutationsGetEnvironmentVncUrlMutation$variables = {
  input: GetEnvironmentVncUrlInput;
};
export type environmentActionMutationsGetEnvironmentVncUrlMutation$data = {
  readonly GetEnvironmentVncUrl: {
    readonly environmentId: string;
    readonly url: string;
  };
};
export type environmentActionMutationsGetEnvironmentVncUrlMutation = {
  response: environmentActionMutationsGetEnvironmentVncUrlMutation$data;
  variables: environmentActionMutationsGetEnvironmentVncUrlMutation$variables;
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
    "name": "environmentActionMutationsGetEnvironmentVncUrlMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentActionMutationsGetEnvironmentVncUrlMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "78133808e2e14111ab60f6f27e5e8992",
    "id": null,
    "metadata": {},
    "name": "environmentActionMutationsGetEnvironmentVncUrlMutation",
    "operationKind": "mutation",
    "text": "mutation environmentActionMutationsGetEnvironmentVncUrlMutation(\n  $input: GetEnvironmentVncUrlInput!\n) {\n  GetEnvironmentVncUrl(input: $input) {\n    environmentId\n    url\n  }\n}\n"
  }
};
})();

(node as any).hash = "db2e42f0a7fcdb1a8f18ae647dfccf56";

export default node;
