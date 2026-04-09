/**
 * @generated SignedSource<<19648282fb60a788de8b994f98274d07>>
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
export type skillsPageUpdateSkillMutation$variables = {
  input: UpdateSkillInput;
};
export type skillsPageUpdateSkillMutation$data = {
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
export type skillsPageUpdateSkillMutation = {
  response: skillsPageUpdateSkillMutation$data;
  variables: skillsPageUpdateSkillMutation$variables;
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
    "name": "skillsPageUpdateSkillMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillsPageUpdateSkillMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e0940beb6b810ce8923df65b0708ba1c",
    "id": null,
    "metadata": {},
    "name": "skillsPageUpdateSkillMutation",
    "operationKind": "mutation",
    "text": "mutation skillsPageUpdateSkillMutation(\n  $input: UpdateSkillInput!\n) {\n  UpdateSkill(input: $input) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    repository\n    skillDirectory\n    fileList\n  }\n}\n"
  }
};
})();

(node as any).hash = "c77dd430a06211c6af0e6ca4a9fe1304";

export default node;
