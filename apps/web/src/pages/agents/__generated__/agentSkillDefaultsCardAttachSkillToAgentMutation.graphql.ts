/**
 * @generated SignedSource<<555dd1fc28070e81184ddaa15217e7a8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SkillType = "custom" | "system" | "%future added value";
export type AttachSkillToAgentInput = {
  agentId: string;
  skillId: string;
};
export type agentSkillDefaultsCardAttachSkillToAgentMutation$variables = {
  input: AttachSkillToAgentInput;
};
export type agentSkillDefaultsCardAttachSkillToAgentMutation$data = {
  readonly AttachSkillToAgent: {
    readonly description: string;
    readonly id: string;
    readonly name: string;
    readonly skillGroupId: string | null | undefined;
    readonly skillType: SkillType;
  };
};
export type agentSkillDefaultsCardAttachSkillToAgentMutation = {
  response: agentSkillDefaultsCardAttachSkillToAgentMutation$data;
  variables: agentSkillDefaultsCardAttachSkillToAgentMutation$variables;
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
    "name": "AttachSkillToAgent",
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
        "name": "skillGroupId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "skillType",
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
    "name": "agentSkillDefaultsCardAttachSkillToAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentSkillDefaultsCardAttachSkillToAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5eec3214a9f46ef5a9ecc3c1a6bc41e4",
    "id": null,
    "metadata": {},
    "name": "agentSkillDefaultsCardAttachSkillToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSkillDefaultsCardAttachSkillToAgentMutation(\n  $input: AttachSkillToAgentInput!\n) {\n  AttachSkillToAgent(input: $input) {\n    id\n    name\n    description\n    skillGroupId\n    skillType\n  }\n}\n"
  }
};
})();

(node as any).hash = "5d30b6e3a73830dc9cc21daab41f1b70";

export default node;
