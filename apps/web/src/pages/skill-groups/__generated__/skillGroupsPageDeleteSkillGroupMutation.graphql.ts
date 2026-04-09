/**
 * @generated SignedSource<<3b04e51a3d625144ee2b519af8ec31e8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteSkillGroupInput = {
  id: string;
};
export type skillGroupsPageDeleteSkillGroupMutation$variables = {
  input: DeleteSkillGroupInput;
};
export type skillGroupsPageDeleteSkillGroupMutation$data = {
  readonly DeleteSkillGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type skillGroupsPageDeleteSkillGroupMutation = {
  response: skillGroupsPageDeleteSkillGroupMutation$data;
  variables: skillGroupsPageDeleteSkillGroupMutation$variables;
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
    "name": "DeleteSkillGroup",
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
    "name": "skillGroupsPageDeleteSkillGroupMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillGroupsPageDeleteSkillGroupMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "3119ceb689196f81a2ea971a59b28216",
    "id": null,
    "metadata": {},
    "name": "skillGroupsPageDeleteSkillGroupMutation",
    "operationKind": "mutation",
    "text": "mutation skillGroupsPageDeleteSkillGroupMutation(\n  $input: DeleteSkillGroupInput!\n) {\n  DeleteSkillGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "d1d224cb2901ea57ee7699f46df51d64";

export default node;
