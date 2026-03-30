/**
 * @generated SignedSource<<4f03351e8cf34d4b9860fd60ed2329bd>>
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
export type environmentsPageStopEnvironmentMutation$variables = {
  input: StopEnvironmentInput;
};
export type environmentsPageStopEnvironmentMutation$data = {
  readonly StopEnvironment: {
    readonly id: string;
    readonly status: string;
  };
};
export type environmentsPageStopEnvironmentMutation = {
  response: environmentsPageStopEnvironmentMutation$data;
  variables: environmentsPageStopEnvironmentMutation$variables;
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
    "name": "environmentsPageStopEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentsPageStopEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "088db43714a6392256f1ad18e399c935",
    "id": null,
    "metadata": {},
    "name": "environmentsPageStopEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation environmentsPageStopEnvironmentMutation(\n  $input: StopEnvironmentInput!\n) {\n  StopEnvironment(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "af74a28c0a8a55a1bc9baa812b478537";

export default node;
