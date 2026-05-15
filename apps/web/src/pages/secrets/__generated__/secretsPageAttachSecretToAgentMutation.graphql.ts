/**
 * @generated SignedSource<<b16a56e6756a73e3938b725cc1fc913b>>
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
export type secretsPageAttachSecretToAgentMutation$variables = {
  input: AttachSecretToAgentInput;
};
export type secretsPageAttachSecretToAgentMutation$data = {
  readonly AttachSecretToAgent: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
  };
};
export type secretsPageAttachSecretToAgentMutation = {
  response: secretsPageAttachSecretToAgentMutation$data;
  variables: secretsPageAttachSecretToAgentMutation$variables;
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
    "name": "secretsPageAttachSecretToAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretsPageAttachSecretToAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "1ea680739d45127390821a48f7cde89e",
    "id": null,
    "metadata": {},
    "name": "secretsPageAttachSecretToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation secretsPageAttachSecretToAgentMutation(\n  $input: AttachSecretToAgentInput!\n) {\n  AttachSecretToAgent(input: $input) {\n    id\n    name\n    description\n    envVarName\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b5f63de28bc56d5153c9dab14771f98c";

export default node;
