/**
 * @generated SignedSource<<c06d27708a22f8b8f9fbe5e2ca2c1918>>
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
    readonly description: string;
    readonly fileInventory: ReadonlyArray<{
      readonly path: string;
      readonly url: string | null | undefined;
    }>;
    readonly fileList: ReadonlyArray<string>;
    readonly githubBranchName: string | null | undefined;
    readonly githubBranchSkillFileUrl: string | null | undefined;
    readonly githubTrackedCommitSha: string | null | undefined;
    readonly githubTrackedCommitSkillFileUrl: string | null | undefined;
    readonly id: string;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string | null | undefined;
    readonly repositoryUrl: string | null | undefined;
    readonly skillDirectory: string | null | undefined;
    readonly skillDirectoryUrl: string | null | undefined;
    readonly skillGroupId: string | null | undefined;
    readonly skillType: SkillType;
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
        "name": "githubBranchName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "githubBranchSkillFileUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "githubTrackedCommitSha",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "githubTrackedCommitSkillFileUrl",
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
    "cacheID": "5d080715c6466b2d667a01b80907012e",
    "id": null,
    "metadata": {},
    "name": "skillDetailPageUpdateSkillMutation",
    "operationKind": "mutation",
    "text": "mutation skillDetailPageUpdateSkillMutation(\n  $input: UpdateSkillInput!\n) {\n  UpdateSkill(input: $input) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    skillType\n    repository\n    repositoryUrl\n    skillDirectory\n    skillDirectoryUrl\n    fileList\n    fileInventory {\n      path\n      url\n    }\n    githubBranchName\n    githubBranchSkillFileUrl\n    githubTrackedCommitSha\n    githubTrackedCommitSkillFileUrl\n  }\n}\n"
  }
};
})();

(node as any).hash = "d41731dae142c0957a6cd0ff6b1c4ab3";

export default node;
