/**
 * @generated SignedSource<<68788e5ce33fbf8afde9803cfd03c7a8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateSkillGroupInput = {
  name: string;
};
export type skillGroupsPageCreateSkillGroupMutation$variables = {
  input: CreateSkillGroupInput;
};
export type skillGroupsPageCreateSkillGroupMutation$data = {
  readonly CreateSkillGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type skillGroupsPageCreateSkillGroupMutation = {
  response: skillGroupsPageCreateSkillGroupMutation$data;
  variables: skillGroupsPageCreateSkillGroupMutation$variables;
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
    "name": "CreateSkillGroup",
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
    "name": "skillGroupsPageCreateSkillGroupMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillGroupsPageCreateSkillGroupMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7476aab0e4b3ee1a9e071824d439f9d7",
    "id": null,
    "metadata": {},
    "name": "skillGroupsPageCreateSkillGroupMutation",
    "operationKind": "mutation",
    "text": "mutation skillGroupsPageCreateSkillGroupMutation(\n  $input: CreateSkillGroupInput!\n) {\n  CreateSkillGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "09d40531d644caa29737fa1017c64340";

export default node;
