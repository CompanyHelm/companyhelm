/**
 * @generated SignedSource<<08b65264e91cd5c583f5ec5011f6fc16>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type StopEnvironmentInput = {
  id: string;
};
export type chatsPageDataStopEnvironmentMutation$variables = {
  input: StopEnvironmentInput;
};
export type chatsPageDataStopEnvironmentMutation$data = {
  readonly StopEnvironment: {
    readonly id: string;
  };
};
export type chatsPageDataStopEnvironmentMutation = {
  response: chatsPageDataStopEnvironmentMutation$data;
  variables: chatsPageDataStopEnvironmentMutation$variables;
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
    "concreteType": "Environment",
    "kind": "LinkedField",
    "name": "StopEnvironment",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
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
    "name": "chatsPageDataStopEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataStopEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5b715742b38e96eb2b65fd18213e94b6",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataStopEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataStopEnvironmentMutation(\n  $input: StopEnvironmentInput!\n) {\n  StopEnvironment(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "ded79c7d11ddbeca7f34e34c4203cebb";

export default node;
