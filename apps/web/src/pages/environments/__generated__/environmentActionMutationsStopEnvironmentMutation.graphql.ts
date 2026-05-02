/**
 * @generated SignedSource<<eb8069c94d8e93ee089ac0598465acc7>>
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
export type environmentActionMutationsStopEnvironmentMutation$variables = {
  input: StopEnvironmentInput;
};
export type environmentActionMutationsStopEnvironmentMutation$data = {
  readonly StopEnvironment: {
    readonly id: string;
    readonly status: string;
  };
};
export type environmentActionMutationsStopEnvironmentMutation = {
  response: environmentActionMutationsStopEnvironmentMutation$data;
  variables: environmentActionMutationsStopEnvironmentMutation$variables;
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
    "name": "environmentActionMutationsStopEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentActionMutationsStopEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "6714525fcbcca7a67fbd471f86f8cf1f",
    "id": null,
    "metadata": {},
    "name": "environmentActionMutationsStopEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation environmentActionMutationsStopEnvironmentMutation(\n  $input: StopEnvironmentInput!\n) {\n  StopEnvironment(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "b21a5ef4889a2c1048434a39dc9a2955";

export default node;
