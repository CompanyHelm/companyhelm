/**
 * @generated SignedSource<<dc80967616810063f92cc6c95cf5843f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteRoutineTriggerInput = {
  id: string;
};
export type routinesPageDeleteRoutineTriggerMutation$variables = {
  input: DeleteRoutineTriggerInput;
};
export type routinesPageDeleteRoutineTriggerMutation$data = {
  readonly DeleteRoutineTrigger: {
    readonly id: string;
    readonly routineId: string;
  };
};
export type routinesPageDeleteRoutineTriggerMutation = {
  response: routinesPageDeleteRoutineTriggerMutation$data;
  variables: routinesPageDeleteRoutineTriggerMutation$variables;
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
    "concreteType": "RoutineCronTrigger",
    "kind": "LinkedField",
    "name": "DeleteRoutineTrigger",
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
        "name": "routineId",
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
    "name": "routinesPageDeleteRoutineTriggerMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "routinesPageDeleteRoutineTriggerMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "60658c7ce95ced7da43b21ca9dc15ee2",
    "id": null,
    "metadata": {},
    "name": "routinesPageDeleteRoutineTriggerMutation",
    "operationKind": "mutation",
    "text": "mutation routinesPageDeleteRoutineTriggerMutation(\n  $input: DeleteRoutineTriggerInput!\n) {\n  DeleteRoutineTrigger(input: $input) {\n    id\n    routineId\n  }\n}\n"
  }
};
})();

(node as any).hash = "21b3d31a67b7223df46608111ea5a78b";

export default node;
