/**
 * @generated SignedSource<<b158700fae63735dda53c9a07b3345d5>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreatePlatformModelInput = {
  description?: string | null | undefined;
  isDefault?: boolean | null | undefined;
  modelId: string;
  modelProvider: string;
  name?: string | null | undefined;
  reasoningLevels?: ReadonlyArray<string> | null | undefined;
  reasoningSupported?: boolean | null | undefined;
};
export type modelsPageCreateMutation$variables = {
  input: CreatePlatformModelInput;
};
export type modelsPageCreateMutation$data = {
  readonly CreatePlatformModel: {
    readonly id: string;
  };
};
export type modelsPageCreateMutation = {
  response: modelsPageCreateMutation$data;
  variables: modelsPageCreateMutation$variables;
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
    "concreteType": "PlatformModel",
    "kind": "LinkedField",
    "name": "CreatePlatformModel",
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
    "name": "modelsPageCreateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelsPageCreateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2f44c0c4d6b28f39c63b50be3261d4a0",
    "id": null,
    "metadata": {},
    "name": "modelsPageCreateMutation",
    "operationKind": "mutation",
    "text": "mutation modelsPageCreateMutation(\n  $input: CreatePlatformModelInput!\n) {\n  CreatePlatformModel(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "cedb4743c5e35db30a857e60025bb367";

export default node;
