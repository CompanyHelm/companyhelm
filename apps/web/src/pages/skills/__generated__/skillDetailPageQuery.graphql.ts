/**
 * @generated SignedSource<<2539a11644038aeb8467c84f896d1523>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SkillType = "custom" | "system" | "%future added value";
export type skillDetailPageQuery$variables = {
  skillId: string;
};
export type skillDetailPageQuery$data = {
  readonly Skill: {
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
    readonly systemCommands: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly inputSchema: any;
    }>;
    readonly systemKey: string | null | undefined;
    readonly trackedCommitSha: string | null | undefined;
    readonly trackedCommitSkillFileUrl: string | null | undefined;
  };
  readonly SkillGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
};
export type skillDetailPageQuery = {
  response: skillDetailPageQuery$data;
  variables: skillDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "skillId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
},
v4 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "skillId"
      }
    ],
    "concreteType": "Skill",
    "kind": "LinkedField",
    "name": "Skill",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/),
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
        "name": "systemKey",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "SystemCommand",
        "kind": "LinkedField",
        "name": "systemCommands",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          (v3/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "inputSchema",
            "storageKey": null
          }
        ],
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
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "SkillGroup",
    "kind": "LinkedField",
    "name": "SkillGroups",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "skillDetailPageQuery",
    "selections": (v4/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillDetailPageQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "4494a92e853a003d5bf2f68dfee5fddf",
    "id": null,
    "metadata": {},
    "name": "skillDetailPageQuery",
    "operationKind": "query",
    "text": "query skillDetailPageQuery(\n  $skillId: ID!\n) {\n  Skill(id: $skillId) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    skillType\n    systemKey\n    systemCommands {\n      id\n      description\n      inputSchema\n    }\n    repository\n    repositoryUrl\n    skillDirectory\n    skillDirectoryUrl\n    fileList\n    fileInventory {\n      path\n      url\n    }\n    branchName\n    branchSkillFileUrl\n    trackedCommitSha\n    trackedCommitSkillFileUrl\n  }\n  SkillGroups {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "b241afe3782bd501f74c427417a1c7e8";

export default node;
