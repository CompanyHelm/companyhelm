/**
 * @generated SignedSource<<3d1b4700c7dd3a160bbd77d4a5c5b42f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type repositoriesPageCreateGithubInstallationUrlMutation$variables = Record<PropertyKey, never>;
export type repositoriesPageCreateGithubInstallationUrlMutation$data = {
  readonly CreateGithubInstallationUrl: {
    readonly url: string;
  };
};
export type repositoriesPageCreateGithubInstallationUrlMutation = {
  response: repositoriesPageCreateGithubInstallationUrlMutation$data;
  variables: repositoriesPageCreateGithubInstallationUrlMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "CreateGithubInstallationUrlPayload",
    "kind": "LinkedField",
    "name": "CreateGithubInstallationUrl",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "url",
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
    "name": "repositoriesPageCreateGithubInstallationUrlMutation",
    "selections": (v0/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "repositoriesPageCreateGithubInstallationUrlMutation",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "5dbc2d510b105213b558f96df439f55f",
    "id": null,
    "metadata": {},
    "name": "repositoriesPageCreateGithubInstallationUrlMutation",
    "operationKind": "mutation",
    "text": "mutation repositoriesPageCreateGithubInstallationUrlMutation {\n  CreateGithubInstallationUrl {\n    url\n  }\n}\n"
  }
};
})();

(node as any).hash = "34339e07d2e50dea22054eabecaf479f";

export default node;
