/**
 * @generated SignedSource<<19ab33dfbbb861f1c7265c69fa7c2ea5>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type skillGroupsPageQuery$variables = Record<PropertyKey, never>;
export type skillGroupsPageQuery$data = {
  readonly SkillGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Skills: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly skillGroupId: string | null | undefined;
  }>;
};
export type skillGroupsPageQuery = {
  response: skillGroupsPageQuery$data;
  variables: skillGroupsPageQuery$variables;
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
    "name": "skillGroupsPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "skillGroupsPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "a170d0508665163f9f115d2858aed4ef",
    "id": null,
    "metadata": {},
    "name": "skillGroupsPageQuery",
    "operationKind": "query",
    "text": "query skillGroupsPageQuery {\n  SkillGroups {\n    id\n    name\n  }\n  Skills {\n    id\n    name\n    skillGroupId\n  }\n}\n"
  }
};
})();

(node as any).hash = "691ca9e9ce7701fbfb2287ee7a6b4279";

export default node;
