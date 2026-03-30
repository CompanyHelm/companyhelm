/**
 * @generated SignedSource<<35f3385371579a828b18b98dc6224163>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type StartEnvironmentInput = {
  id: string;
};
export type environmentsPageStartEnvironmentMutation$variables = {
  input: StartEnvironmentInput;
};
export type environmentsPageStartEnvironmentMutation$data = {
  readonly StartEnvironment: {
    readonly id: string;
    readonly status: string;
  };
};
export type environmentsPageStartEnvironmentMutation = {
  response: environmentsPageStartEnvironmentMutation$data;
  variables: environmentsPageStartEnvironmentMutation$variables;
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
    "name": "StartEnvironment",
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
    "name": "environmentsPageStartEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentsPageStartEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "0299a1b211b91a4eb995c228aa06fbc8",
    "id": null,
    "metadata": {},
    "name": "environmentsPageStartEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation environmentsPageStartEnvironmentMutation(\n  $input: StartEnvironmentInput!\n) {\n  StartEnvironment(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "675416710aa55ca2ab072176e1a6243d";

export default node;
