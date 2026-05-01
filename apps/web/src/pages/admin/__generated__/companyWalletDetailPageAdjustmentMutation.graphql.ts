/**
 * @generated SignedSource<<409083e5bfde7b8ed9e78d9756c55998>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AddPlatformAdminWalletAdjustmentInput = {
  amountNanoUsd: number;
  companyId: string;
  walletId: string;
};
export type companyWalletDetailPageAdjustmentMutation$variables = {
  input: AddPlatformAdminWalletAdjustmentInput;
};
export type companyWalletDetailPageAdjustmentMutation$data = {
  readonly AddPlatformAdminWalletAdjustment: {
    readonly amountNanoUsd: number;
    readonly category: string;
    readonly companyId: string;
    readonly createdAt: string;
    readonly id: string;
    readonly walletId: string;
  };
};
export type companyWalletDetailPageAdjustmentMutation = {
  response: companyWalletDetailPageAdjustmentMutation$data;
  variables: companyWalletDetailPageAdjustmentMutation$variables;
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
    "concreteType": "PlatformAdminWalletTransaction",
    "kind": "LinkedField",
    "name": "AddPlatformAdminWalletAdjustment",
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
        "name": "companyId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "walletId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "category",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "amountNanoUsd",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
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
    "name": "companyWalletDetailPageAdjustmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "companyWalletDetailPageAdjustmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "547548d07d3c5c8053425070a254e884",
    "id": null,
    "metadata": {},
    "name": "companyWalletDetailPageAdjustmentMutation",
    "operationKind": "mutation",
    "text": "mutation companyWalletDetailPageAdjustmentMutation(\n  $input: AddPlatformAdminWalletAdjustmentInput!\n) {\n  AddPlatformAdminWalletAdjustment(input: $input) {\n    id\n    companyId\n    walletId\n    category\n    amountNanoUsd\n    createdAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "7e7e71b03b8435cbcf8cc4eb42ec27c7";

export default node;
