/**
 * @generated SignedSource<<33d02fc19e0ffb393b2922f38e7ec18b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateSkillInput = {
  description: string;
  instructions: string;
  name: string;
  skillGroupId?: string | null | undefined;
};
export type skillsPageCreateSkillMutation$variables = {
  input: CreateSkillInput;
};
export type skillsPageCreateSkillMutation$data = {
  readonly CreateSkill: {
    readonly description: string;
    readonly fileList: ReadonlyArray<string>;
    readonly id: string;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string | null | undefined;
    readonly skillDirectory: string | null | undefined;
    readonly skillGroupId: string | null | undefined;
  };
};
export type skillsPageCreateSkillMutation = {
  response: skillsPageCreateSkillMutation$data;
  variables: skillsPageCreateSkillMutation$variables;
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
    "name": "CreateSkill",
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
        "name": "instructions",
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
        "name": "repository",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "skillDirectory",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "fileList",
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
    "name": "skillsPageCreateSkillMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillsPageCreateSkillMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c6668f1de2cea1aa40af808ece97fd55",
    "id": null,
    "metadata": {},
    "name": "skillsPageCreateSkillMutation",
    "operationKind": "mutation",
    "text": "mutation skillsPageCreateSkillMutation(\n  $input: CreateSkillInput!\n) {\n  CreateSkill(input: $input) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    repository\n    skillDirectory\n    fileList\n  }\n}\n"
  }
};
})();

(node as any).hash = "86e2e2f64bbf395def801d0e2292ad21";

export default node;
