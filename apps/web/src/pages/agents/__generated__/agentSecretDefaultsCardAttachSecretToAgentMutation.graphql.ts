/**
 * @generated SignedSource<<15c1779a9e3ee31c126eef86c0354dfd>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AttachSecretToAgentInput = {
  agentId: string;
  secretId: string;
};
export type agentSecretDefaultsCardAttachSecretToAgentMutation$variables = {
  input: AttachSecretToAgentInput;
};
export type agentSecretDefaultsCardAttachSecretToAgentMutation$data = {
  readonly AttachSecretToAgent: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
  };
};
export type agentSecretDefaultsCardAttachSecretToAgentMutation = {
  response: agentSecretDefaultsCardAttachSecretToAgentMutation$data;
  variables: agentSecretDefaultsCardAttachSecretToAgentMutation$variables;
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
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "AttachSecretToAgent",
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
        "name": "name",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "envVarName",
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
    "name": "agentSecretDefaultsCardAttachSecretToAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentSecretDefaultsCardAttachSecretToAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5730251a9d9e3d2b98caa1dcb582dd24",
    "id": null,
    "metadata": {},
    "name": "agentSecretDefaultsCardAttachSecretToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSecretDefaultsCardAttachSecretToAgentMutation(\n  $input: AttachSecretToAgentInput!\n) {\n  AttachSecretToAgent(input: $input) {\n    id\n    name\n    description\n    envVarName\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "eee504a2453a5f099b2e6d819728efbe";

export default node;
