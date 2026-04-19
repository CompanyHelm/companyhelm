/**
 * @generated SignedSource<<449225c04b2fccae0ad47148cd1077b2>>
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
export type workflowDetailPageStartRunMutation$variables = {
  input: StartWorkflowRunInput;
};
export type workflowDetailPageStartRunMutation$data = {
  readonly StartWorkflowRun: {
    readonly agentId: string;
    readonly completedAt: string | null | undefined;
    readonly createdAt: string;
    readonly id: string;
    readonly runningStepRunId: string | null | undefined;
    readonly sessionId: string;
    readonly startedAt: string | null | undefined;
    readonly status: string;
    readonly updatedAt: string;
    readonly workflowDefinitionId: string | null | undefined;
  };
};
export type workflowDetailPageStartRunMutation = {
  response: workflowDetailPageStartRunMutation$data;
  variables: workflowDetailPageStartRunMutation$variables;
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
        "name": "runningStepRunId",
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
        "name": "completedAt",
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
    "name": "workflowDetailPageStartRunMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowDetailPageStartRunMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "ed5dedc6f83198e873028c1b419894db",
    "id": null,
    "metadata": {},
    "name": "workflowDetailPageStartRunMutation",
    "operationKind": "mutation",
    "text": "mutation workflowDetailPageStartRunMutation(\n  $input: StartWorkflowRunInput!\n) {\n  StartWorkflowRun(input: $input) {\n    id\n    workflowDefinitionId\n    status\n    agentId\n    sessionId\n    runningStepRunId\n    startedAt\n    completedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "13c3fe67107cfa212fc183e7c53ad60f";

export default node;
