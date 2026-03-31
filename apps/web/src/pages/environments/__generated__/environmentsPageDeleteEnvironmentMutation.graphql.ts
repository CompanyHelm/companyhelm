/**
 * @generated SignedSource<<b04f50d3fba6dfeeba91f7e9443d1a20>>
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
export type environmentsPageDeleteEnvironmentMutation$variables = {
  input: DeleteEnvironmentInput;
};
export type environmentsPageDeleteEnvironmentMutation$data = {
  readonly DeleteEnvironment: {
    readonly id: string;
  };
};
export type environmentsPageDeleteEnvironmentMutation = {
  response: environmentsPageDeleteEnvironmentMutation$data;
  variables: environmentsPageDeleteEnvironmentMutation$variables;
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
    "name": "environmentsPageDeleteEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentsPageDeleteEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c3eb7a0c93cb99f71f4ba90e46678ca0",
    "id": null,
    "metadata": {},
    "name": "environmentsPageDeleteEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation environmentsPageDeleteEnvironmentMutation(\n  $input: DeleteEnvironmentInput!\n) {\n  DeleteEnvironment(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "46207b8e5dd3c1737fc433d5e002b384";

export default node;
