/**
 * @generated SignedSource<<c9018701a9e968ebe859ec2451a5a692>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateAgentEnvironmentRequirementsInput = {
  agentId: string;
  minCpuCount: number;
  minDiskSpaceGb: number;
  minMemoryGb: number;
};
export type agentEnvironmentRequirementsCardUpdateMutation$variables = {
  input: UpdateAgentEnvironmentRequirementsInput;
};
export type agentEnvironmentRequirementsCardUpdateMutation$data = {
  readonly UpdateAgentEnvironmentRequirements: {
    readonly minCpuCount: number;
    readonly minDiskSpaceGb: number;
    readonly minMemoryGb: number;
  };
};
export type agentEnvironmentRequirementsCardUpdateMutation = {
  response: agentEnvironmentRequirementsCardUpdateMutation$data;
  variables: agentEnvironmentRequirementsCardUpdateMutation$variables;
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
    "concreteType": "AgentEnvironmentRequirements",
    "kind": "LinkedField",
    "name": "UpdateAgentEnvironmentRequirements",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "minCpuCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "minMemoryGb",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "minDiskSpaceGb",
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
    "name": "agentEnvironmentRequirementsCardUpdateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentEnvironmentRequirementsCardUpdateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7b8e6435d07026b4c89709814da87e41",
    "id": null,
    "metadata": {},
    "name": "agentEnvironmentRequirementsCardUpdateMutation",
    "operationKind": "mutation",
    "text": "mutation agentEnvironmentRequirementsCardUpdateMutation(\n  $input: UpdateAgentEnvironmentRequirementsInput!\n) {\n  UpdateAgentEnvironmentRequirements(input: $input) {\n    minCpuCount\n    minMemoryGb\n    minDiskSpaceGb\n  }\n}\n"
  }
};
})();

(node as any).hash = "87d6a61e5e11c8dba881da8c2be926d3";

export default node;
