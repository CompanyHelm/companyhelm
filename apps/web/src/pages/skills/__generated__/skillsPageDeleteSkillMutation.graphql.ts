/**
 * @generated SignedSource<<6cfb2314f78a40ee932f3dee35863057>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteSkillInput = {
  id: string;
};
export type skillsPageDeleteSkillMutation$variables = {
  input: DeleteSkillInput;
};
export type skillsPageDeleteSkillMutation$data = {
  readonly DeleteSkill: {
    readonly id: string;
  };
};
export type skillsPageDeleteSkillMutation = {
  response: skillsPageDeleteSkillMutation$data;
  variables: skillsPageDeleteSkillMutation$variables;
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
    "name": "DeleteSkill",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
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
    "name": "skillsPageDeleteSkillMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillsPageDeleteSkillMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c078afbcea9fcf1870169510d3a96ecd",
    "id": null,
    "metadata": {},
    "name": "skillsPageDeleteSkillMutation",
    "operationKind": "mutation",
    "text": "mutation skillsPageDeleteSkillMutation(\n  $input: DeleteSkillInput!\n) {\n  DeleteSkill(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "dbaee8c911d1ce2ebdfe885004f749f1";

export default node;
