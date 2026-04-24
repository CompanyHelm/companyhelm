/**
 * @generated SignedSource<<0d6522b8db36ada01777cb626c0648fa>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type flowCreateGithubInstallationUrlMutation$variables = {
  returnPath?: string | null | undefined;
};
export type flowCreateGithubInstallationUrlMutation$data = {
  readonly CreateGithubInstallationUrl: {
    readonly url: string;
  };
};
export type flowCreateGithubInstallationUrlMutation = {
  response: flowCreateGithubInstallationUrlMutation$data;
  variables: flowCreateGithubInstallationUrlMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "returnPath"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "returnPath",
        "variableName": "returnPath"
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
    "name": "flowCreateGithubInstallationUrlMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "flowCreateGithubInstallationUrlMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "9a9f3c01087a187349534135759af370",
    "id": null,
    "metadata": {},
    "name": "flowCreateGithubInstallationUrlMutation",
    "operationKind": "mutation",
    "text": "mutation flowCreateGithubInstallationUrlMutation(\n  $returnPath: String\n) {\n  CreateGithubInstallationUrl(returnPath: $returnPath) {\n    url\n  }\n}\n"
  }
};
})();

(node as any).hash = "25b2d658c1fcceb4ab782a9d5e67fb1e";

export default node;
