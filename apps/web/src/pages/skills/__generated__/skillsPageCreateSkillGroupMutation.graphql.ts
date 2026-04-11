/**
 * @generated SignedSource<<898c02f887a301636eb74dca875c16c1>>
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
export type skillsPageCreateSkillGroupMutation$variables = {
  input: CreateSkillGroupInput;
};
export type skillsPageCreateSkillGroupMutation$data = {
  readonly CreateSkillGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type skillsPageCreateSkillGroupMutation = {
  response: skillsPageCreateSkillGroupMutation$data;
  variables: skillsPageCreateSkillGroupMutation$variables;
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
    "name": "skillsPageCreateSkillGroupMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillsPageCreateSkillGroupMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c381a47905a61a592823b7ef0b489d43",
    "id": null,
    "metadata": {},
    "name": "skillsPageCreateSkillGroupMutation",
    "operationKind": "mutation",
    "text": "mutation skillsPageCreateSkillGroupMutation(\n  $input: CreateSkillGroupInput!\n) {\n  CreateSkillGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "4cbcca5f218a90c7f1566a814fde6860";

export default node;
