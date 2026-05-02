/**
 * @generated SignedSource<<fa91ddd1f219624e0e3802aec6f2cf3c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteEnvironmentInput = {
  force?: boolean | null | undefined;
  id: string;
};
export type environmentActionMutationsDeleteEnvironmentMutation$variables = {
  input: DeleteEnvironmentInput;
};
export type environmentActionMutationsDeleteEnvironmentMutation$data = {
  readonly DeleteEnvironment: {
    readonly id: string;
  };
};
export type environmentActionMutationsDeleteEnvironmentMutation = {
  response: environmentActionMutationsDeleteEnvironmentMutation$data;
  variables: environmentActionMutationsDeleteEnvironmentMutation$variables;
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
    "name": "DeleteEnvironment",
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
    "name": "environmentActionMutationsDeleteEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentActionMutationsDeleteEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "256ae808bce71e4e6fd2be6561ba7ea5",
    "id": null,
    "metadata": {},
    "name": "environmentActionMutationsDeleteEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation environmentActionMutationsDeleteEnvironmentMutation(\n  $input: DeleteEnvironmentInput!\n) {\n  DeleteEnvironment(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "364f8daf1add0d1f1db4463ed442e9b6";

export default node;
