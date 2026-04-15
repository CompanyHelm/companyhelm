/**
 * @generated SignedSource<<cbb2a7c1825e2173e9863241da2de026>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DetachSkillFromSessionInput = {
  sessionId: string;
  skillId: string;
};
export type chatsPageDataDetachSkillFromSessionMutation$variables = {
  input: DetachSkillFromSessionInput;
};
export type chatsPageDataDetachSkillFromSessionMutation$data = {
  readonly DetachSkillFromSession: {
    readonly description: string;
    readonly id: string;
    readonly name: string;
  };
};
export type chatsPageDataDetachSkillFromSessionMutation = {
  response: chatsPageDataDetachSkillFromSessionMutation$data;
  variables: chatsPageDataDetachSkillFromSessionMutation$variables;
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
    "name": "DetachSkillFromSession",
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
    "name": "chatsPageDataDetachSkillFromSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataDetachSkillFromSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "1fa88d319c6cc6d65e9001b4221e8e2c",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataDetachSkillFromSessionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataDetachSkillFromSessionMutation(\n  $input: DetachSkillFromSessionInput!\n) {\n  DetachSkillFromSession(input: $input) {\n    id\n    name\n    description\n  }\n}\n"
  }
};
})();

(node as any).hash = "fd4d92c7523516dc0fd0dbe5d4c34337";

export default node;
