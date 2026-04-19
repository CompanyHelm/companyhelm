/**
 * @generated SignedSource<<ed8a64e4327efd4779709fe3cb18e8ac>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type StartWorkflowRunInput = {
  agentId: string;
  inputValues: ReadonlyArray<WorkflowRunInputValueInput>;
  workflowDefinitionId: string;
};
export type WorkflowRunInputValueInput = {
  name: string;
  value: string;
};
export type workflowsPageStartRunMutation$variables = {
  input: StartWorkflowRunInput;
};
export type workflowsPageStartRunMutation$data = {
  readonly StartWorkflowRun: {
    readonly agentId: string;
    readonly createdAt: string;
    readonly id: string;
    readonly sessionId: string;
    readonly startedAt: string | null | undefined;
    readonly status: string;
    readonly updatedAt: string;
    readonly workflowDefinitionId: string | null | undefined;
  };
};
export type workflowsPageStartRunMutation = {
  response: workflowsPageStartRunMutation$data;
  variables: workflowsPageStartRunMutation$variables;
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
    "concreteType": "WorkflowRun",
    "kind": "LinkedField",
    "name": "StartWorkflowRun",
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "agentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sessionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "startedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
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
    "name": "workflowsPageStartRunMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowsPageStartRunMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c7cdff1eeb76e170da8d7490bcd5ac0d",
    "id": null,
    "metadata": {},
    "name": "workflowsPageStartRunMutation",
    "operationKind": "mutation",
    "text": "mutation workflowsPageStartRunMutation(\n  $input: StartWorkflowRunInput!\n) {\n  StartWorkflowRun(input: $input) {\n    id\n    workflowDefinitionId\n    status\n    agentId\n    sessionId\n    startedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "341a74420778f09f95c460fe1829603e";

export default node;
