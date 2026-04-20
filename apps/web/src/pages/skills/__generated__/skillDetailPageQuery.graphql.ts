/**
 * @generated SignedSource<<79e22d88f7c5fd467a540d8b704e4914>>
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
    readonly description: string;
    readonly fileList: ReadonlyArray<string>;
    readonly id: string;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string | null | undefined;
    readonly skillDirectory: string | null | undefined;
    readonly skillGroupId: string | null | undefined;
    readonly skillType: SkillType;
    readonly systemCommands: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly inputSchema: any;
    }>;
    readonly systemKey: string | null | undefined;
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
    "cacheID": "404dadfa0ad94759e504008c3ecb384f",
    "id": null,
    "metadata": {},
    "name": "skillDetailPageQuery",
    "operationKind": "query",
    "text": "query skillDetailPageQuery(\n  $skillId: ID!\n) {\n  Skill(id: $skillId) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    skillType\n    systemKey\n    systemCommands {\n      id\n      description\n      inputSchema\n    }\n    repository\n    skillDirectory\n    fileList\n  }\n  SkillGroups {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "6bed55a1973de993e759c4aadaf1e659";

export default node;
