/**
 * @generated SignedSource<<b7e9a0341033276f7a37f7d1332a45c9>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DetachSecretGroupFromAgentInput = {
  agentId: string;
  secretGroupId: string;
};
export type agentSecretDefaultsCardDetachSecretGroupFromAgentMutation$variables = {
  input: DetachSecretGroupFromAgentInput;
};
export type agentSecretDefaultsCardDetachSecretGroupFromAgentMutation$data = {
  readonly DetachSecretGroupFromAgent: {
    readonly id: string;
  };
};
export type agentSecretDefaultsCardDetachSecretGroupFromAgentMutation = {
  response: agentSecretDefaultsCardDetachSecretGroupFromAgentMutation$data;
  variables: agentSecretDefaultsCardDetachSecretGroupFromAgentMutation$variables;
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
    "concreteType": "SecretGroup",
    "kind": "LinkedField",
    "name": "DetachSecretGroupFromAgent",
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
    "name": "agentSecretDefaultsCardDetachSecretGroupFromAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentSecretDefaultsCardDetachSecretGroupFromAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e495abbe01813c1351feadf3be433cf5",
    "id": null,
    "metadata": {},
    "name": "agentSecretDefaultsCardDetachSecretGroupFromAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSecretDefaultsCardDetachSecretGroupFromAgentMutation(\n  $input: DetachSecretGroupFromAgentInput!\n) {\n  DetachSecretGroupFromAgent(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "484bc519be982ef45ed133464e30bd33";

export default node;
