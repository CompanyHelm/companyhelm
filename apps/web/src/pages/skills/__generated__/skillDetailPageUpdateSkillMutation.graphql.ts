/**
 * @generated SignedSource<<6afb98a6075454d000635a48e5fe61a9>>
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
    readonly fileList: ReadonlyArray<string>;
    readonly githubBranchName: string | null | undefined;
    readonly githubTrackedCommitSha: string | null | undefined;
    readonly id: string;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string | null | undefined;
    readonly skillDirectory: string | null | undefined;
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
        "name": "skillDirectory",
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
        "kind": "ScalarField",
        "name": "githubBranchName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "githubTrackedCommitSha",
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
    "cacheID": "14813f4a76e82b045660b6a620c05330",
    "id": null,
    "metadata": {},
    "name": "skillDetailPageUpdateSkillMutation",
    "operationKind": "mutation",
    "text": "mutation skillDetailPageUpdateSkillMutation(\n  $input: UpdateSkillInput!\n) {\n  UpdateSkill(input: $input) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    skillType\n    repository\n    skillDirectory\n    fileList\n    githubBranchName\n    githubTrackedCommitSha\n  }\n}\n"
  }
};
})();

(node as any).hash = "21c6051cc1b4dec605faa3c388e848bc";

export default node;
