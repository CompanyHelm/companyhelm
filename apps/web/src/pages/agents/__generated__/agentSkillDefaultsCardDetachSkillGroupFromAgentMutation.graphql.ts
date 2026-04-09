/**
 * @generated SignedSource<<01d987d4058fb3558407a068de2b51bb>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DetachSkillGroupFromAgentInput = {
  agentId: string;
  skillGroupId: string;
};
export type agentSkillDefaultsCardDetachSkillGroupFromAgentMutation$variables = {
  input: DetachSkillGroupFromAgentInput;
};
export type agentSkillDefaultsCardDetachSkillGroupFromAgentMutation$data = {
  readonly DetachSkillGroupFromAgent: {
    readonly id: string;
  };
};
export type agentSkillDefaultsCardDetachSkillGroupFromAgentMutation = {
  response: agentSkillDefaultsCardDetachSkillGroupFromAgentMutation$data;
  variables: agentSkillDefaultsCardDetachSkillGroupFromAgentMutation$variables;
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
    "concreteType": "SkillGroup",
    "kind": "LinkedField",
    "name": "DetachSkillGroupFromAgent",
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
    "name": "agentSkillDefaultsCardDetachSkillGroupFromAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentSkillDefaultsCardDetachSkillGroupFromAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "ddc4cc7aba79c1c0393790fb1d67d9e6",
    "id": null,
    "metadata": {},
    "name": "agentSkillDefaultsCardDetachSkillGroupFromAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSkillDefaultsCardDetachSkillGroupFromAgentMutation(\n  $input: DetachSkillGroupFromAgentInput!\n) {\n  DetachSkillGroupFromAgent(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "51bd62e68b8f685ea20aa777024c30b7";

export default node;
