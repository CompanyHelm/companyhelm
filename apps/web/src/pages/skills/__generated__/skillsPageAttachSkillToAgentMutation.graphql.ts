/**
 * @generated SignedSource<<cb823a9f938dcca04b278c606be5a393>>
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
export type skillsPageAttachSkillToAgentMutation$variables = {
  input: AttachSkillToAgentInput;
};
export type skillsPageAttachSkillToAgentMutation$data = {
  readonly AttachSkillToAgent: {
    readonly description: string;
    readonly id: string;
    readonly name: string;
    readonly skillGroupId: string | null | undefined;
    readonly skillType: SkillType;
  };
};
export type skillsPageAttachSkillToAgentMutation = {
  response: skillsPageAttachSkillToAgentMutation$data;
  variables: skillsPageAttachSkillToAgentMutation$variables;
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
    "name": "skillsPageAttachSkillToAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillsPageAttachSkillToAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "d54fe340d43cd0f02635776e6cec3c04",
    "id": null,
    "metadata": {},
    "name": "skillsPageAttachSkillToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation skillsPageAttachSkillToAgentMutation(\n  $input: AttachSkillToAgentInput!\n) {\n  AttachSkillToAgent(input: $input) {\n    id\n    name\n    description\n    skillGroupId\n    skillType\n  }\n}\n"
  }
};
})();

(node as any).hash = "e6f1303045558283084da746f9994476";

export default node;
