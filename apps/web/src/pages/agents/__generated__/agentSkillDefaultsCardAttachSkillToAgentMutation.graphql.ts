/**
 * @generated SignedSource<<9bd159934787002922e54d1b8ace2ceb>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
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
    "cacheID": "6d4022d43dffaf9b97ea29eba6610ce8",
    "id": null,
    "metadata": {},
    "name": "agentSkillDefaultsCardAttachSkillToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSkillDefaultsCardAttachSkillToAgentMutation(\n  $input: AttachSkillToAgentInput!\n) {\n  AttachSkillToAgent(input: $input) {\n    id\n    name\n    description\n    skillGroupId\n  }\n}\n"
  }
};
})();

(node as any).hash = "bbef2033f1dfefb20892298e06dd8503";

export default node;
