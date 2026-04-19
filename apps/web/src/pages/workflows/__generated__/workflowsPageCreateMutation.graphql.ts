/**
 * @generated SignedSource<<f521f4e9a9fb19907ae8f3c7f0e022f5>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateWorkflowInput = {
  description?: string | null | undefined;
  inputs: ReadonlyArray<WorkflowInputDraftInput>;
  instructions?: string | null | undefined;
  isEnabled?: boolean | null | undefined;
  name: string;
  steps: ReadonlyArray<WorkflowStepDraftInput>;
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
export type workflowsPageCreateMutation$variables = {
  input: CreateWorkflowInput;
};
export type workflowsPageCreateMutation$data = {
  readonly CreateWorkflow: {
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
    readonly updatedAt: string;
  };
};
export type workflowsPageCreateMutation = {
  response: workflowsPageCreateMutation$data;
  variables: workflowsPageCreateMutation$variables;
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
v6 = [
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
    "name": "CreateWorkflow",
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
      (v5/*: any*/),
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
    "name": "workflowsPageCreateMutation",
    "selections": (v6/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowsPageCreateMutation",
    "selections": (v6/*: any*/)
  },
  "params": {
    "cacheID": "f53a4723d34b2b6d6c68cfca666f04d5",
    "id": null,
    "metadata": {},
    "name": "workflowsPageCreateMutation",
    "operationKind": "mutation",
    "text": "mutation workflowsPageCreateMutation(\n  $input: CreateWorkflowInput!\n) {\n  CreateWorkflow(input: $input) {\n    id\n    name\n    description\n    instructions\n    isEnabled\n    inputs {\n      id\n      name\n      description\n      isRequired\n      defaultValue\n      createdAt\n    }\n    steps {\n      id\n      stepId\n      name\n      instructions\n      ordinal\n      createdAt\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "37e53fccd1d0d57b57080aae776ca2d3";

export default node;
