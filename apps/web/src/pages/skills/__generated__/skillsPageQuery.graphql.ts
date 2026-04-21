/**
 * @generated SignedSource<<5ca529d9af21c954dd9628caf42d4628>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SkillType = "custom" | "system" | "%future added value";
export type skillsPageQuery$variables = Record<PropertyKey, never>;
export type skillsPageQuery$data = {
  readonly GithubRepositories: ReadonlyArray<{
    readonly archived: boolean;
    readonly defaultBranch: string | null | undefined;
    readonly fullName: string;
    readonly id: string;
    readonly name: string;
  }>;
  readonly SkillGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Skills: ReadonlyArray<{
    readonly fileList: ReadonlyArray<string>;
    readonly id: string;
    readonly name: string;
    readonly repository: string | null | undefined;
    readonly skillGroupId: string | null | undefined;
    readonly skillType: SkillType;
  }>;
};
export type skillsPageQuery = {
  response: skillsPageQuery$data;
  variables: skillsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "SkillGroup",
    "kind": "LinkedField",
    "name": "SkillGroups",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "GithubRepository",
    "kind": "LinkedField",
    "name": "GithubRepositories",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "fullName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultBranch",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "archived",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Skill",
    "kind": "LinkedField",
    "name": "Skills",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
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
        "name": "fileList",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "skillsPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "skillsPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "552fd4286281e88a36119df83316b405",
    "id": null,
    "metadata": {},
    "name": "skillsPageQuery",
    "operationKind": "query",
    "text": "query skillsPageQuery {\n  SkillGroups {\n    id\n    name\n  }\n  GithubRepositories {\n    id\n    name\n    fullName\n    defaultBranch\n    archived\n  }\n  Skills {\n    id\n    name\n    skillGroupId\n    skillType\n    repository\n    fileList\n  }\n}\n"
  }
};
})();

(node as any).hash = "7f80a522a12bb03234212df980851738";

export default node;
