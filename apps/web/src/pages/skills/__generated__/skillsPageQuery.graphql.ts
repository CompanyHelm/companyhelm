/**
 * @generated SignedSource<<0af2cd3c8d2bf05224d8319a26f73a61>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type skillsPageQuery$variables = Record<PropertyKey, never>;
export type skillsPageQuery$data = {
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
    "cacheID": "2ec025c412e6452e357b738a113a3367",
    "id": null,
    "metadata": {},
    "name": "skillsPageQuery",
    "operationKind": "query",
    "text": "query skillsPageQuery {\n  SkillGroups {\n    id\n    name\n  }\n  Skills {\n    id\n    name\n    skillGroupId\n    repository\n    fileList\n  }\n}\n"
  }
};
})();

(node as any).hash = "04bbef063ad2ff847a60ab3158bd9772";

export default node;
