/**
 * @generated SignedSource<<67277a9ad60bed89627922190794965e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateWorkflowCronTriggerInput = {
  agentId: string;
  cronPattern: string;
  enabled?: boolean | null | undefined;
  inputValues: ReadonlyArray<WorkflowRunInputValueInput>;
  timezone: string;
  workflowDefinitionId: string;
};
export type WorkflowRunInputValueInput = {
  name: string;
  value: string;
};
export type workflowDetailPageCreateCronTriggerMutation$variables = {
  input: CreateWorkflowCronTriggerInput;
};
export type workflowDetailPageCreateCronTriggerMutation$data = {
  readonly CreateWorkflowCronTrigger: {
    readonly agentId: string;
    readonly agentName: string;
    readonly createdAt: string;
    readonly cronPattern: string;
    readonly enabled: boolean;
    readonly id: string;
    readonly inputValues: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly value: string;
    }>;
    readonly overlapPolicy: string;
    readonly timezone: string;
    readonly type: string;
    readonly updatedAt: string;
    readonly workflowDefinitionId: string;
  };
};
export type workflowDetailPageCreateCronTriggerMutation = {
  response: workflowDetailPageCreateCronTriggerMutation$data;
  variables: workflowDetailPageCreateCronTriggerMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
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
    "name": "CreateWorkflowCronTrigger",
    "plural": false,
    "selections": [
      (v1/*: any*/),
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
        "name": "agentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "agentName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "enabled",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "overlapPolicy",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "cronPattern",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "timezone",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowTriggerInputValue",
        "kind": "LinkedField",
        "name": "inputValues",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "name",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "value",
            "storageKey": null
          }
        ],
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
    "name": "workflowDetailPageCreateCronTriggerMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowDetailPageCreateCronTriggerMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "dc61dea90040d876287ef08c6b0b8141",
    "id": null,
    "metadata": {},
    "name": "workflowDetailPageCreateCronTriggerMutation",
    "operationKind": "mutation",
    "text": "mutation workflowDetailPageCreateCronTriggerMutation(\n  $input: CreateWorkflowCronTriggerInput!\n) {\n  CreateWorkflowCronTrigger(input: $input) {\n    id\n    workflowDefinitionId\n    agentId\n    agentName\n    type\n    enabled\n    overlapPolicy\n    cronPattern\n    timezone\n    inputValues {\n      id\n      name\n      value\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "98829cfad139924d0e27c50e615f68de";

export default node;
