/**
 * @generated SignedSource<<23e16e7580471922c0aaad08d43b2689>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type artifactDetailPageQuery$variables = {
  artifactId: string;
  taskId: string;
};
export type artifactDetailPageQuery$data = {
  readonly Artifact: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly name: string;
    readonly pullRequestNumber: number | null | undefined;
    readonly pullRequestProvider: string | null | undefined;
    readonly pullRequestRepository: string | null | undefined;
    readonly state: string;
    readonly taskId: string | null | undefined;
    readonly type: string;
    readonly updatedAt: string;
    readonly url: string | null | undefined;
  };
  readonly Task: {
    readonly id: string;
    readonly name: string;
  };
};
export type artifactDetailPageQuery = {
  response: artifactDetailPageQuery$data;
  variables: artifactDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "artifactId"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "taskId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "taskId"
      }
    ],
    "concreteType": "Task",
    "kind": "LinkedField",
    "name": "Task",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "artifactId"
      }
    ],
    "concreteType": "Artifact",
    "kind": "LinkedField",
    "name": "Artifact",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "taskId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "state",
        "storageKey": null
      },
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "markdownContent",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "url",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestProvider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestRepository",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestNumber",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "artifactDetailPageQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "artifactDetailPageQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "18794fe99471b9f415020d8fb5e7a460",
    "id": null,
    "metadata": {},
    "name": "artifactDetailPageQuery",
    "operationKind": "query",
    "text": "query artifactDetailPageQuery(\n  $artifactId: ID!\n  $taskId: ID!\n) {\n  Task(id: $taskId) {\n    id\n    name\n  }\n  Artifact(id: $artifactId) {\n    id\n    taskId\n    type\n    state\n    name\n    description\n    markdownContent\n    url\n    pullRequestProvider\n    pullRequestRepository\n    pullRequestNumber\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "748bc50adad983e5404bdd93b33abe91";

export default node;
