/**
 * @generated SignedSource<<3255b7e2f0e66326fc633fcb9f4e544d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type settingsPageQuery$variables = Record<PropertyKey, never>;
export type settingsPageQuery$data = {
  readonly CompanySettings: {
    readonly baseSystemPrompt: string | null | undefined;
    readonly companyId: string;
  };
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
    };
  };
  readonly TaskStages: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly taskCount: number;
    readonly updatedAt: string;
  }>;
};
export type settingsPageQuery = {
  response: settingsPageQuery$data;
  variables: settingsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Me",
    "kind": "LinkedField",
    "name": "Me",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AuthenticatedCompany",
        "kind": "LinkedField",
        "name": "company",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/)
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "CompanySettings",
    "kind": "LinkedField",
    "name": "CompanySettings",
    "plural": false,
    "selections": [
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
        "name": "baseSystemPrompt",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "TaskStage",
    "kind": "LinkedField",
    "name": "TaskStages",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
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
        "name": "taskCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "settingsPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "settingsPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "831d79392d6d88da8d3a44a63b832eba",
    "id": null,
    "metadata": {},
    "name": "settingsPageQuery",
    "operationKind": "query",
    "text": "query settingsPageQuery {\n  Me {\n    company {\n      id\n      name\n    }\n  }\n  CompanySettings {\n    companyId\n    baseSystemPrompt\n  }\n  TaskStages {\n    id\n    name\n    isDefault\n    taskCount\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "d3405185ef61ae326abf94e7a041709a";

export default node;
