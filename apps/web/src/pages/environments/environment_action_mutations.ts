import { graphql } from "react-relay";

export const environmentActionDeleteEnvironmentMutationNode = graphql`
  mutation environmentActionMutationsDeleteEnvironmentMutation($input: DeleteEnvironmentInput!) {
    DeleteEnvironment(input: $input) {
      id
    }
  }
`;

export const environmentActionStartEnvironmentMutationNode = graphql`
  mutation environmentActionMutationsStartEnvironmentMutation($input: StartEnvironmentInput!) {
    StartEnvironment(input: $input) {
      id
      status
    }
  }
`;

export const environmentActionGetEnvironmentVncUrlMutationNode = graphql`
  mutation environmentActionMutationsGetEnvironmentVncUrlMutation($input: GetEnvironmentVncUrlInput!) {
    GetEnvironmentVncUrl(input: $input) {
      environmentId
      url
    }
  }
`;

export const environmentActionStopEnvironmentMutationNode = graphql`
  mutation environmentActionMutationsStopEnvironmentMutation($input: StopEnvironmentInput!) {
    StopEnvironment(input: $input) {
      id
      status
    }
  }
`;
