/**
 * @generated SignedSource<<2f7d8a237e85ae32622022749223633f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteAgentInput = {
  id: string;
};
export type agentsPageDeleteAgentMutation$variables = {
  input: DeleteAgentInput;
};
export type agentsPageDeleteAgentMutation$data = {
  readonly DeleteAgent: {
    readonly id: string;
  };
};
export type agentsPageDeleteAgentMutation = {
  response: agentsPageDeleteAgentMutation$data;
  variables: agentsPageDeleteAgentMutation$variables;
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
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "DeleteAgent",
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
    "name": "agentsPageDeleteAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentsPageDeleteAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "43aa27022d24d3e8db8298a2eb9635ac",
    "id": null,
    "metadata": {},
    "name": "agentsPageDeleteAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentsPageDeleteAgentMutation(\n  $input: DeleteAgentInput!\n) {\n  DeleteAgent(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "62164da90dc23828d846cdcaab52d511";

export default node;
