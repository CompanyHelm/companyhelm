/**
 * @generated SignedSource<<1a954cd522fbf9d9d15b43327d9a0ace>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteRoutineInput = {
  id: string;
};
export type routinesPageDeleteRoutineMutation$variables = {
  input: DeleteRoutineInput;
};
export type routinesPageDeleteRoutineMutation$data = {
  readonly DeleteRoutine: {
    readonly id: string;
  };
};
export type routinesPageDeleteRoutineMutation = {
  response: routinesPageDeleteRoutineMutation$data;
  variables: routinesPageDeleteRoutineMutation$variables;
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
    "concreteType": "Routine",
    "kind": "LinkedField",
    "name": "DeleteRoutine",
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
    "name": "routinesPageDeleteRoutineMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "routinesPageDeleteRoutineMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "30a60c4d905fb4176838b7ca85e621dd",
    "id": null,
    "metadata": {},
    "name": "routinesPageDeleteRoutineMutation",
    "operationKind": "mutation",
    "text": "mutation routinesPageDeleteRoutineMutation(\n  $input: DeleteRoutineInput!\n) {\n  DeleteRoutine(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "25a84e9f161139d55d231c7f029a585d";

export default node;
