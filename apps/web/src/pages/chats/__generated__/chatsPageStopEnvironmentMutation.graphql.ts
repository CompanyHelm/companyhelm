/**
 * @generated SignedSource<<f79c54677b93a115c5597d68e374b5f3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type StopEnvironmentInput = {
  id: string;
};
export type chatsPageStopEnvironmentMutation$variables = {
  input: StopEnvironmentInput;
};
export type chatsPageStopEnvironmentMutation$data = {
  readonly StopEnvironment: {
    readonly id: string;
    readonly status: string;
  };
};
export type chatsPageStopEnvironmentMutation = {
  response: chatsPageStopEnvironmentMutation$data;
  variables: chatsPageStopEnvironmentMutation$variables;
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
    "concreteType": "Environment",
    "kind": "LinkedField",
    "name": "StopEnvironment",
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
        "name": "status",
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
    "name": "chatsPageStopEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageStopEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "fe4d8d01349845413c8b99334c121ed9",
    "id": null,
    "metadata": {},
    "name": "chatsPageStopEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageStopEnvironmentMutation(\n  $input: StopEnvironmentInput!\n) {\n  StopEnvironment(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "c8f07ffadb12ed02886b5dc9db080b7d";

export default node;
