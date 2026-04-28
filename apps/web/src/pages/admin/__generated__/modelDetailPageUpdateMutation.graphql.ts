/**
 * @generated SignedSource<<695525cf6a825687526414ac0f191aab>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdatePlatformModelInput = {
  description?: string | null | undefined;
  isAvailable?: boolean | null | undefined;
  isDefault?: boolean | null | undefined;
  name?: string | null | undefined;
  platformModelId: string;
  reasoningLevels?: ReadonlyArray<string> | null | undefined;
  reasoningSupported?: boolean | null | undefined;
};
export type modelDetailPageUpdateMutation$variables = {
  input: UpdatePlatformModelInput;
};
export type modelDetailPageUpdateMutation$data = {
  readonly UpdatePlatformModel: {
    readonly id: string;
    readonly isAvailable: boolean;
    readonly isDefault: boolean;
    readonly routeCount: number;
    readonly updatedAt: string;
  };
};
export type modelDetailPageUpdateMutation = {
  response: modelDetailPageUpdateMutation$data;
  variables: modelDetailPageUpdateMutation$variables;
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
    "name": "UpdatePlatformModel",
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
        "name": "isAvailable",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isDefault",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "routeCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
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
    "name": "modelDetailPageUpdateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelDetailPageUpdateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "03904a01bd2fff9f1fc1da53b013897b",
    "id": null,
    "metadata": {},
    "name": "modelDetailPageUpdateMutation",
    "operationKind": "mutation",
    "text": "mutation modelDetailPageUpdateMutation(\n  $input: UpdatePlatformModelInput!\n) {\n  UpdatePlatformModel(input: $input) {\n    id\n    isAvailable\n    isDefault\n    routeCount\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "8a2c3cc2717d3a601475d63892a4241d";

export default node;
