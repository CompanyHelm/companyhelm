/**
 * @generated SignedSource<<81508b985d6cf04dd26fa90fbd436b3c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type createSkillDialogGithubSkillDirectoriesQuery$variables = {
  repositoryId: string;
};
export type createSkillDialogGithubSkillDirectoriesQuery$data = {
  readonly GithubSkillDirectories: ReadonlyArray<{
    readonly fileList: ReadonlyArray<string>;
    readonly name: string;
    readonly path: string;
  }>;
};
export type createSkillDialogGithubSkillDirectoriesQuery = {
  response: createSkillDialogGithubSkillDirectoriesQuery$data;
  variables: createSkillDialogGithubSkillDirectoriesQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "repositoryId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "repositoryId",
        "variableName": "repositoryId"
      }
    ],
    "concreteType": "GithubSkillDirectory",
    "kind": "LinkedField",
    "name": "GithubSkillDirectories",
    "plural": true,
    "selections": [
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
        "name": "path",
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
    "name": "createSkillDialogGithubSkillDirectoriesQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "createSkillDialogGithubSkillDirectoriesQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b37942f47f14af5802940e4237229dda",
    "id": null,
    "metadata": {},
    "name": "createSkillDialogGithubSkillDirectoriesQuery",
    "operationKind": "query",
    "text": "query createSkillDialogGithubSkillDirectoriesQuery(\n  $repositoryId: ID!\n) {\n  GithubSkillDirectories(repositoryId: $repositoryId) {\n    name\n    path\n    fileList\n  }\n}\n"
  }
};
})();

(node as any).hash = "05ffc3a8fed486936ac41acba8b4ed80";

export default node;
