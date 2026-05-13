/**
 * @generated SignedSource<<b647ba6ac337bafd2d2172265b389b30>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ArchiveArtifactInput = {
  id: string;
};
export type chatsPageDataArchiveArtifactMutation$variables = {
  input: ArchiveArtifactInput;
};
export type chatsPageDataArchiveArtifactMutation$data = {
  readonly ArchiveArtifact: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly name: string;
    readonly pullRequestNumber: number | null | undefined;
    readonly pullRequestProvider: string | null | undefined;
    readonly pullRequestRepository: string | null | undefined;
    readonly scopeType: string;
    readonly sessionId: string | null | undefined;
    readonly state: string;
    readonly taskId: string | null | undefined;
    readonly type: string;
    readonly updatedAt: string;
    readonly url: string | null | undefined;
  };
};
export type chatsPageDataArchiveArtifactMutation = {
  response: chatsPageDataArchiveArtifactMutation$data;
  variables: chatsPageDataArchiveArtifactMutation$variables;
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
    "concreteType": "Artifact",
    "kind": "LinkedField",
    "name": "ArchiveArtifact",
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
        "name": "sessionId",
        "storageKey": null
      },
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
        "name": "scopeType",
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
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "name",
        "storageKey": null
      },
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
    "name": "chatsPageDataArchiveArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataArchiveArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2dec25c3f2d21c99c17d33e17cb3930a",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataArchiveArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataArchiveArtifactMutation(\n  $input: ArchiveArtifactInput!\n) {\n  ArchiveArtifact(input: $input) {\n    id\n    sessionId\n    taskId\n    scopeType\n    type\n    state\n    name\n    description\n    markdownContent\n    url\n    pullRequestProvider\n    pullRequestRepository\n    pullRequestNumber\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b70262d5087e66d6e1ff5b2e169fac7b";

export default node;
