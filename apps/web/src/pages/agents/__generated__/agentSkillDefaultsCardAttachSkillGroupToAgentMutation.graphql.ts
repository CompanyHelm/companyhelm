/**
 * @generated SignedSource<<6ab4b7136edfc179aefd96290400d459>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AttachSkillGroupToAgentInput = {
  agentId: string;
  skillGroupId: string;
};
export type agentSkillDefaultsCardAttachSkillGroupToAgentMutation$variables = {
  input: AttachSkillGroupToAgentInput;
};
export type agentSkillDefaultsCardAttachSkillGroupToAgentMutation$data = {
  readonly AttachSkillGroupToAgent: {
    readonly id: string;
    readonly name: string;
  };
};
export type agentSkillDefaultsCardAttachSkillGroupToAgentMutation = {
  response: agentSkillDefaultsCardAttachSkillGroupToAgentMutation$data;
  variables: agentSkillDefaultsCardAttachSkillGroupToAgentMutation$variables;
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
    "name": "AttachSkillGroupToAgent",
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
    "name": "agentSkillDefaultsCardAttachSkillGroupToAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentSkillDefaultsCardAttachSkillGroupToAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "0ba2cb5361f09f4b78adb83486588617",
    "id": null,
    "metadata": {},
    "name": "agentSkillDefaultsCardAttachSkillGroupToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSkillDefaultsCardAttachSkillGroupToAgentMutation(\n  $input: AttachSkillGroupToAgentInput!\n) {\n  AttachSkillGroupToAgent(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "a2b14c3130c05e492ee24a7034f34f84";

export default node;
