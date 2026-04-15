/**
 * @generated SignedSource<<dba24b175d8ceaac1805fa892cb5e3d6>>
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
    "cacheID": "32a06db948a9bd2e11a2fd485bc42047",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataDetachSkillFromSessionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataDetachSkillFromSessionMutation(\n  $input: DetachSkillFromSessionInput!\n) {\n  DetachSkillFromSession(input: $input) {\n    id\n    name\n    description\n  }\n}\n"
  }
};
})();

(node as any).hash = "fdf48ef8cce1248b8ac4e0d62b510f18";

export default node;
