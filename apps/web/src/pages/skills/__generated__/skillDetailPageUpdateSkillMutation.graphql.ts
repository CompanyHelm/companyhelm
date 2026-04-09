/**
 * @generated SignedSource<<04dff7a83bd5c03af8872578da3f615d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateSkillInput = {
  description?: string | null | undefined;
  id: string;
  instructions?: string | null | undefined;
  name?: string | null | undefined;
  skillGroupId?: string | null | undefined;
};
export type skillDetailPageUpdateSkillMutation$variables = {
  input: UpdateSkillInput;
};
export type skillDetailPageUpdateSkillMutation$data = {
  readonly UpdateSkill: {
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
export type skillDetailPageUpdateSkillMutation = {
  response: skillDetailPageUpdateSkillMutation$data;
  variables: skillDetailPageUpdateSkillMutation$variables;
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
    "name": "UpdateSkill",
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
    "name": "skillDetailPageUpdateSkillMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillDetailPageUpdateSkillMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "dd9715b85e7e331225cac269d6abfe13",
    "id": null,
    "metadata": {},
    "name": "skillDetailPageUpdateSkillMutation",
    "operationKind": "mutation",
    "text": "mutation skillDetailPageUpdateSkillMutation(\n  $input: UpdateSkillInput!\n) {\n  UpdateSkill(input: $input) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    repository\n    skillDirectory\n    fileList\n  }\n}\n"
  }
};
})();

(node as any).hash = "f63f68cc9f1fc775bd0b636b7ba54b3f";

export default node;
