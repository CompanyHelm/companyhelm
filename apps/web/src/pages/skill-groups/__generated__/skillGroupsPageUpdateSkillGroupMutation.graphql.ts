/**
 * @generated SignedSource<<1bdabfd60a138c1ff8fc81e9ad240dde>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateSkillGroupInput = {
  id: string;
  name?: string | null | undefined;
};
export type skillGroupsPageUpdateSkillGroupMutation$variables = {
  input: UpdateSkillGroupInput;
};
export type skillGroupsPageUpdateSkillGroupMutation$data = {
  readonly UpdateSkillGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type skillGroupsPageUpdateSkillGroupMutation = {
  response: skillGroupsPageUpdateSkillGroupMutation$data;
  variables: skillGroupsPageUpdateSkillGroupMutation$variables;
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
    "name": "UpdateSkillGroup",
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
    "name": "skillGroupsPageUpdateSkillGroupMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillGroupsPageUpdateSkillGroupMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2d6123697108feffb97cd5f518ac2247",
    "id": null,
    "metadata": {},
    "name": "skillGroupsPageUpdateSkillGroupMutation",
    "operationKind": "mutation",
    "text": "mutation skillGroupsPageUpdateSkillGroupMutation(\n  $input: UpdateSkillGroupInput!\n) {\n  UpdateSkillGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "64ae7a946571ecf7272407cf4c13a167";

export default node;
