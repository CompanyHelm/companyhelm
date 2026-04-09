/**
 * @generated SignedSource<<bfc904a6af376924636097855bf9e633>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DetachSkillFromAgentInput = {
  agentId: string;
  skillId: string;
};
export type agentSkillDefaultsCardDetachSkillFromAgentMutation$variables = {
  input: DetachSkillFromAgentInput;
};
export type agentSkillDefaultsCardDetachSkillFromAgentMutation$data = {
  readonly DetachSkillFromAgent: {
    readonly id: string;
  };
};
export type agentSkillDefaultsCardDetachSkillFromAgentMutation = {
  response: agentSkillDefaultsCardDetachSkillFromAgentMutation$data;
  variables: agentSkillDefaultsCardDetachSkillFromAgentMutation$variables;
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
    "concreteType": "Skill",
    "kind": "LinkedField",
    "name": "DetachSkillFromAgent",
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
    "name": "agentSkillDefaultsCardDetachSkillFromAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentSkillDefaultsCardDetachSkillFromAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "46c891318c983e257818323b0c069efe",
    "id": null,
    "metadata": {},
    "name": "agentSkillDefaultsCardDetachSkillFromAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSkillDefaultsCardDetachSkillFromAgentMutation(\n  $input: DetachSkillFromAgentInput!\n) {\n  DetachSkillFromAgent(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "6196c228c8266af31f3ab5dd09882278";

export default node;
