/**
 * @generated SignedSource<<78e0c57a1342e31845c85ee7d0c5e0fb>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type dashboardPageQuery$variables = Record<PropertyKey, never>;
export type dashboardPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly modelName: string | null | undefined;
    readonly modelProvider: string | null | undefined;
    readonly name: string;
    readonly reasoningLevel: string | null | undefined;
    readonly updatedAt: string;
  }>;
  readonly Environments: ReadonlyArray<{
    readonly agentId: string;
    readonly agentName: string | null | undefined;
    readonly displayName: string | null | undefined;
    readonly id: string;
    readonly provider: string;
    readonly providerEnvironmentId: string;
    readonly status: string;
    readonly updatedAt: string;
  }>;
  readonly GithubInstallations: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly installationId: string;
  }>;
  readonly GithubRepositories: ReadonlyArray<{
    readonly archived: boolean;
    readonly defaultBranch: string | null | undefined;
    readonly fullName: string;
    readonly githubInstallationId: string;
    readonly htmlUrl: string | null | undefined;
    readonly id: string;
    readonly isPrivate: boolean;
    readonly name: string;
    readonly updatedAt: string;
  }>;
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
    };
  };
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly type: string;
    readonly updatedAt: string;
  }>;
  readonly Sessions: ReadonlyArray<{
    readonly agentId: string;
    readonly id: string;
    readonly inferredTitle: string | null | undefined;
    readonly status: string;
    readonly updatedAt: string;
    readonly userSetTitle: string | null | undefined;
  }>;
};
export type dashboardPageQuery = {
  response: dashboardPageQuery$data;
  variables: dashboardPageQuery$variables;
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
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "agentId",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v6 = [
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
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningLevel",
        "storageKey": null
      },
      (v3/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Session",
    "kind": "LinkedField",
    "name": "Sessions",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v4/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "inferredTitle",
        "storageKey": null
      },
      (v5/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "userSetTitle",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "GithubInstallation",
    "kind": "LinkedField",
    "name": "GithubInstallations",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "installationId",
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
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "GithubRepository",
    "kind": "LinkedField",
    "name": "GithubRepositories",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "githubInstallationId",
        "storageKey": null
      },
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "fullName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "htmlUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isPrivate",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultBranch",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "archived",
        "storageKey": null
      },
      (v3/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Environment",
    "kind": "LinkedField",
    "name": "Environments",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v4/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "agentName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "displayName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "provider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "providerEnvironmentId",
        "storageKey": null
      },
      (v5/*: any*/),
      (v3/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProviderCredential",
    "kind": "LinkedField",
    "name": "ModelProviderCredentials",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "type",
        "storageKey": null
      },
      (v3/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "dashboardPageQuery",
    "selections": (v6/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "dashboardPageQuery",
    "selections": (v6/*: any*/)
  },
  "params": {
    "cacheID": "26f8510503ce43473d03277f5464f036",
    "id": null,
    "metadata": {},
    "name": "dashboardPageQuery",
    "operationKind": "query",
    "text": "query dashboardPageQuery {\n  Me {\n    company {\n      id\n      name\n    }\n  }\n  Agents {\n    id\n    name\n    modelProvider\n    modelName\n    reasoningLevel\n    updatedAt\n  }\n  Sessions {\n    id\n    agentId\n    inferredTitle\n    status\n    updatedAt\n    userSetTitle\n  }\n  GithubInstallations {\n    id\n    installationId\n    createdAt\n  }\n  GithubRepositories {\n    id\n    githubInstallationId\n    name\n    fullName\n    htmlUrl\n    isPrivate\n    defaultBranch\n    archived\n    updatedAt\n  }\n  Environments {\n    id\n    agentId\n    agentName\n    displayName\n    provider\n    providerEnvironmentId\n    status\n    updatedAt\n  }\n  ModelProviderCredentials {\n    id\n    name\n    modelProvider\n    type\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "2177c764c3bf42c7f8c862f582cbad37";

export default node;
