/**
 * @generated SignedSource<<3b5d1e815b235f7c5b014ea41f692c81>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteWorkflowInput = {
  id: string;
};
export type workflowsPageDeleteMutation$variables = {
  input: DeleteWorkflowInput;
};
export type workflowsPageDeleteMutation$data = {
  readonly DeleteWorkflow: {
    readonly id: string;
  };
};
export type workflowsPageDeleteMutation = {
  response: workflowsPageDeleteMutation$data;
  variables: workflowsPageDeleteMutation$variables;
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
    "concreteType": "Workflow",
    "kind": "LinkedField",
    "name": "DeleteWorkflow",
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
    "name": "workflowsPageDeleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowsPageDeleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b19549cf60a959506c3ff598b98b36c3",
    "id": null,
    "metadata": {},
    "name": "workflowsPageDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation workflowsPageDeleteMutation(\n  $input: DeleteWorkflowInput!\n) {\n  DeleteWorkflow(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "42c6085507a2e3702071dd5e0c76621f";

export default node;
