/**
 * @generated SignedSource<<af80b41b12e3e285213d3e5b68e733df>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateWorkflowInput = {
  description?: string | null | undefined;
  id: string;
  inputs?: ReadonlyArray<WorkflowInputDraftInput> | null | undefined;
  instructions?: string | null | undefined;
  isEnabled?: boolean | null | undefined;
  name?: string | null | undefined;
  steps?: ReadonlyArray<WorkflowStepDraftInput> | null | undefined;
};
export type WorkflowInputDraftInput = {
  defaultValue?: string | null | undefined;
  description?: string | null | undefined;
  isRequired?: boolean | null | undefined;
  name: string;
};
export type WorkflowStepDraftInput = {
  instructions?: string | null | undefined;
  name: string;
};
export type workflowDetailPageUpdateMutation$variables = {
  input: UpdateWorkflowInput;
};
export type workflowDetailPageUpdateMutation$data = {
  readonly UpdateWorkflow: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly inputs: ReadonlyArray<{
      readonly createdAt: string;
      readonly defaultValue: string | null | undefined;
      readonly description: string | null | undefined;
      readonly id: string;
      readonly isRequired: boolean;
      readonly name: string;
    }>;
    readonly instructions: string | null | undefined;
    readonly isEnabled: boolean;
    readonly name: string;
    readonly steps: ReadonlyArray<{
      readonly createdAt: string;
      readonly id: string;
      readonly instructions: string | null | undefined;
      readonly name: string;
      readonly ordinal: number;
      readonly stepId: string;
    }>;
    readonly triggers: ReadonlyArray<{
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
    }>;
    readonly updatedAt: string;
  };
};
export type workflowDetailPageUpdateMutation = {
  response: workflowDetailPageUpdateMutation$data;
  variables: workflowDetailPageUpdateMutation$variables;
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
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "instructions",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v7 = [
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
    "name": "UpdateWorkflow",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/),
      (v4/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isEnabled",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowInput",
        "kind": "LinkedField",
        "name": "inputs",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "isRequired",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "defaultValue",
            "storageKey": null
          },
          (v5/*: any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowStep",
        "kind": "LinkedField",
        "name": "steps",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "stepId",
            "storageKey": null
          },
          (v2/*: any*/),
          (v4/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "ordinal",
            "storageKey": null
          },
          (v5/*: any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowCronTrigger",
        "kind": "LinkedField",
        "name": "triggers",
        "plural": true,
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
              (v2/*: any*/),
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
          (v5/*: any*/),
          (v6/*: any*/)
        ],
        "storageKey": null
      },
      (v5/*: any*/),
      (v6/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "workflowDetailPageUpdateMutation",
    "selections": (v7/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowDetailPageUpdateMutation",
    "selections": (v7/*: any*/)
  },
  "params": {
    "cacheID": "ad285156f005a4f48311198125250a47",
    "id": null,
    "metadata": {},
    "name": "workflowDetailPageUpdateMutation",
    "operationKind": "mutation",
    "text": "mutation workflowDetailPageUpdateMutation(\n  $input: UpdateWorkflowInput!\n) {\n  UpdateWorkflow(input: $input) {\n    id\n    name\n    description\n    instructions\n    isEnabled\n    inputs {\n      id\n      name\n      description\n      isRequired\n      defaultValue\n      createdAt\n    }\n    steps {\n      id\n      stepId\n      name\n      instructions\n      ordinal\n      createdAt\n    }\n    triggers {\n      id\n      workflowDefinitionId\n      agentId\n      agentName\n      type\n      enabled\n      overlapPolicy\n      cronPattern\n      timezone\n      inputValues {\n        id\n        name\n        value\n      }\n      createdAt\n      updatedAt\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "8dd23be85916fe8d50018ea31296b140";

export default node;
