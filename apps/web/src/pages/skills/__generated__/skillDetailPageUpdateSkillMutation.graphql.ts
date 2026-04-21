/**
 * @generated SignedSource<<657120d618a126a7e8055c5543c05044>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SkillType = "custom" | "system" | "%future added value";
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
    readonly branchName: string | null | undefined;
    readonly branchSkillFileUrl: string | null | undefined;
    readonly description: string;
    readonly fileInventory: ReadonlyArray<{
      readonly path: string;
      readonly url: string | null | undefined;
    }>;
    readonly fileList: ReadonlyArray<string>;
    readonly id: string;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string | null | undefined;
    readonly repositoryUrl: string | null | undefined;
    readonly skillDirectory: string | null | undefined;
    readonly skillDirectoryUrl: string | null | undefined;
    readonly skillGroupId: string | null | undefined;
    readonly skillType: SkillType;
    readonly trackedCommitSha: string | null | undefined;
    readonly trackedCommitSkillFileUrl: string | null | undefined;
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
        "name": "skillType",
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
        "name": "repositoryUrl",
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
        "name": "skillDirectoryUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "fileList",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "SkillFileInventoryEntry",
        "kind": "LinkedField",
        "name": "fileInventory",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "path",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "url",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "branchName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "branchSkillFileUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "trackedCommitSha",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "trackedCommitSkillFileUrl",
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
    "cacheID": "6e6281245458122f78e2657dd0506fe5",
    "id": null,
    "metadata": {},
    "name": "skillDetailPageUpdateSkillMutation",
    "operationKind": "mutation",
    "text": "mutation skillDetailPageUpdateSkillMutation(\n  $input: UpdateSkillInput!\n) {\n  UpdateSkill(input: $input) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    skillType\n    repository\n    repositoryUrl\n    skillDirectory\n    skillDirectoryUrl\n    fileList\n    fileInventory {\n      path\n      url\n    }\n    branchName\n    branchSkillFileUrl\n    trackedCommitSha\n    trackedCommitSkillFileUrl\n  }\n}\n"
  }
};
})();

(node as any).hash = "42e92efa52edae2fa4db2f6a1ba5f3b6";

export default node;
