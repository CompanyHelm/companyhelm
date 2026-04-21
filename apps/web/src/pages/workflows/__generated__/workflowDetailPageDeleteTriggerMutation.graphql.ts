/**
 * @generated SignedSource<<4078362d73359efd0a0cf656c971774e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteWorkflowTriggerInput = {
  id: string;
};
export type workflowDetailPageDeleteTriggerMutation$variables = {
  input: DeleteWorkflowTriggerInput;
};
export type workflowDetailPageDeleteTriggerMutation$data = {
  readonly DeleteWorkflowTrigger: {
    readonly id: string;
    readonly workflowDefinitionId: string;
  };
};
export type workflowDetailPageDeleteTriggerMutation = {
  response: workflowDetailPageDeleteTriggerMutation$data;
  variables: workflowDetailPageDeleteTriggerMutation$variables;
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
    "concreteType": "WorkflowCronTrigger",
    "kind": "LinkedField",
    "name": "DeleteWorkflowTrigger",
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
        "name": "workflowDefinitionId",
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
    "name": "workflowDetailPageDeleteTriggerMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowDetailPageDeleteTriggerMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5b544b7157cb7193f64a5bdffdef7598",
    "id": null,
    "metadata": {},
    "name": "workflowDetailPageDeleteTriggerMutation",
    "operationKind": "mutation",
    "text": "mutation workflowDetailPageDeleteTriggerMutation(\n  $input: DeleteWorkflowTriggerInput!\n) {\n  DeleteWorkflowTrigger(input: $input) {\n    id\n    workflowDefinitionId\n  }\n}\n"
  }
};
})();

(node as any).hash = "1547415e0680a87d2f0acb0222c18e67";

export default node;
