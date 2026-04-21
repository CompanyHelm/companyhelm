/**
 * @generated SignedSource<<7217414dc71dbfaa8e1b5621a889a9c1>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SkillType = "custom" | "system" | "%future added value";
export type UpdateSkillFromRepositoryInput = {
  id: string;
};
export type skillDetailPageUpdateSkillFromRepositoryMutation$variables = {
  input: UpdateSkillFromRepositoryInput;
};
export type skillDetailPageUpdateSkillFromRepositoryMutation$data = {
  readonly UpdateSkillFromRepository: {
    readonly autoUpdate: boolean;
    readonly branchCommitSha: string | null | undefined;
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
export type skillDetailPageUpdateSkillFromRepositoryMutation = {
  response: skillDetailPageUpdateSkillFromRepositoryMutation$data;
  variables: skillDetailPageUpdateSkillFromRepositoryMutation$variables;
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
    "name": "UpdateSkillFromRepository",
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
        "name": "autoUpdate",
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
        "name": "branchCommitSha",
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
    "name": "skillDetailPageUpdateSkillFromRepositoryMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillDetailPageUpdateSkillFromRepositoryMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e123c4239cb4161028a4c99dccdd3abb",
    "id": null,
    "metadata": {},
    "name": "skillDetailPageUpdateSkillFromRepositoryMutation",
    "operationKind": "mutation",
    "text": "mutation skillDetailPageUpdateSkillFromRepositoryMutation(\n  $input: UpdateSkillFromRepositoryInput!\n) {\n  UpdateSkillFromRepository(input: $input) {\n    id\n    autoUpdate\n    name\n    description\n    instructions\n    skillGroupId\n    skillType\n    repository\n    repositoryUrl\n    skillDirectory\n    skillDirectoryUrl\n    fileList\n    fileInventory {\n      path\n      url\n    }\n    branchName\n    branchCommitSha\n    branchSkillFileUrl\n    trackedCommitSha\n    trackedCommitSkillFileUrl\n  }\n}\n"
  }
};
})();

(node as any).hash = "50b5fbcd84fd73b429a5229bc1f2d395";

export default node;
