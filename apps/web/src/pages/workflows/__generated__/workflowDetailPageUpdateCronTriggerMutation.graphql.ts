/**
 * @generated SignedSource<<208ccc096c3e78dfdc8126d60722d123>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateWorkflowCronTriggerInput = {
  agentId?: string | null | undefined;
  cronPattern?: string | null | undefined;
  enabled?: boolean | null | undefined;
  id: string;
  inputValues?: ReadonlyArray<WorkflowRunInputValueInput> | null | undefined;
  timezone?: string | null | undefined;
};
export type WorkflowRunInputValueInput = {
  name: string;
  value: string;
};
export type workflowDetailPageUpdateCronTriggerMutation$variables = {
  input: UpdateWorkflowCronTriggerInput;
};
export type workflowDetailPageUpdateCronTriggerMutation$data = {
  readonly UpdateWorkflowCronTrigger: {
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
export type workflowDetailPageUpdateCronTriggerMutation = {
  response: workflowDetailPageUpdateCronTriggerMutation$data;
  variables: workflowDetailPageUpdateCronTriggerMutation$variables;
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
    "name": "UpdateWorkflowCronTrigger",
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
    "name": "workflowDetailPageUpdateCronTriggerMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowDetailPageUpdateCronTriggerMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "0265b171a9b1d37270db7722c3612bfc",
    "id": null,
    "metadata": {},
    "name": "workflowDetailPageUpdateCronTriggerMutation",
    "operationKind": "mutation",
    "text": "mutation workflowDetailPageUpdateCronTriggerMutation(\n  $input: UpdateWorkflowCronTriggerInput!\n) {\n  UpdateWorkflowCronTrigger(input: $input) {\n    id\n    workflowDefinitionId\n    agentId\n    agentName\n    type\n    enabled\n    overlapPolicy\n    cronPattern\n    timezone\n    inputValues {\n      id\n      name\n      value\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4a23752565004583092f8525877e4c6e";

export default node;
