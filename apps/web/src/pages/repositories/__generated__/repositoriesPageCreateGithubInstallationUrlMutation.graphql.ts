/**
 * @generated SignedSource<<09aafc3118e2e6e811eede26160dd38b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateGithubInstallationUrlInput = {
  organizationSlug: string;
};
export type repositoriesPageCreateGithubInstallationUrlMutation$variables = {
  input: CreateGithubInstallationUrlInput;
};
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "repositoriesPageCreateGithubInstallationUrlMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "repositoriesPageCreateGithubInstallationUrlMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "9ea3c4ea2bbbfdd4983f4b846304b943",
    "id": null,
    "metadata": {},
    "name": "repositoriesPageCreateGithubInstallationUrlMutation",
    "operationKind": "mutation",
    "text": "mutation repositoriesPageCreateGithubInstallationUrlMutation(\n  $input: CreateGithubInstallationUrlInput!\n) {\n  CreateGithubInstallationUrl(input: $input) {\n    url\n  }\n}\n"
  }
};
})();

(node as any).hash = "54b77f159d873d951d125eb6e4a2f68f";

export default node;
