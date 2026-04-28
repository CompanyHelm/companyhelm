/**
 * @generated SignedSource<<ac3616526d07a14a0273130d4052de93>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ImportPlatformModelInput = {
  isDefault?: boolean | null | undefined;
  modelProvider?: string | null | undefined;
  platformModelProviderCredentialModelId: string;
};
export type modelsPageImportMutation$variables = {
  input: ImportPlatformModelInput;
};
export type modelsPageImportMutation$data = {
  readonly ImportPlatformModel: {
    readonly id: string;
  };
};
export type modelsPageImportMutation = {
  response: modelsPageImportMutation$data;
  variables: modelsPageImportMutation$variables;
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
    "name": "ImportPlatformModel",
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
    "name": "modelsPageImportMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelsPageImportMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2322447d7e96fe2ea477c24aca6ebe63",
    "id": null,
    "metadata": {},
    "name": "modelsPageImportMutation",
    "operationKind": "mutation",
    "text": "mutation modelsPageImportMutation(\n  $input: ImportPlatformModelInput!\n) {\n  ImportPlatformModel(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "e44183774e4de88d3482a62720f88b78";

export default node;
