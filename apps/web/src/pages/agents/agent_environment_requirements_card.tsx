import { useEffect, useState } from "react";
import { graphql, useMutation } from "react-relay";
import { ComputeProviderLimitsCatalog } from "@/compute_provider_limits_catalog";
import { EditableField } from "@/components/editable_field";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { agentEnvironmentRequirementsCardUpdateMutation } from "./__generated__/agentEnvironmentRequirementsCardUpdateMutation.graphql";

const agentEnvironmentRequirementsCardUpdateMutationNode = graphql`
  mutation agentEnvironmentRequirementsCardUpdateMutation(
    $input: UpdateAgentEnvironmentRequirementsInput!
  ) {
    UpdateAgentEnvironmentRequirements(input: $input) {
      minCpuCount
      minMemoryGb
      minDiskSpaceGb
    }
  }
`;

type AgentEnvironmentRequirementsCardProps = {
  agentId: string;
  minCpuCount: number;
  minDiskSpaceGb: number;
  minMemoryGb: number;
  provider: "daytona" | "e2b" | null;
};

/**
 * Renders the minimum compute requirements for an agent and saves inline edits through a dedicated
 * GraphQL mutation so new environments can be provisioned with the requested baseline resources.
 */
export function AgentEnvironmentRequirementsCard(props: AgentEnvironmentRequirementsCardProps) {
  const [commitUpdateRequirements] = useMutation<agentEnvironmentRequirementsCardUpdateMutation>(
    agentEnvironmentRequirementsCardUpdateMutationNode,
  );
  const [requirements, setRequirements] = useState({
    minCpuCount: props.minCpuCount,
    minDiskSpaceGb: props.minDiskSpaceGb,
    minMemoryGb: props.minMemoryGb,
  });

  useEffect(() => {
    setRequirements({
      minCpuCount: props.minCpuCount,
      minDiskSpaceGb: props.minDiskSpaceGb,
      minMemoryGb: props.minMemoryGb,
    });
  }, [props.minCpuCount, props.minDiskSpaceGb, props.minMemoryGb]);

  const saveRequirements = async (patch: {
    minCpuCount?: number;
    minDiskSpaceGb?: number;
    minMemoryGb?: number;
  }) => {
    const nextMinCpuCount = patch.minCpuCount ?? requirements.minCpuCount;
    const nextMinMemoryGb = patch.minMemoryGb ?? requirements.minMemoryGb;
    const nextMinDiskSpaceGb = patch.minDiskSpaceGb ?? requirements.minDiskSpaceGb;

    await new Promise<void>((resolve, reject) => {
      commitUpdateRequirements({
        variables: {
          input: {
            agentId: props.agentId,
            minCpuCount: nextMinCpuCount,
            minMemoryGb: nextMinMemoryGb,
            minDiskSpaceGb: nextMinDiskSpaceGb,
          },
        },
        onCompleted: (_response, errors) => {
          const errorMessage = String(errors?.[0]?.message || "").trim();
          if (errorMessage) {
            reject(new Error(errorMessage));
            return;
          }

          setRequirements({
            minCpuCount: nextMinCpuCount,
            minDiskSpaceGb: nextMinDiskSpaceGb,
            minMemoryGb: nextMinMemoryGb,
          });
          resolve();
        },
        onError: reject,
      });
    });
  };

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardDescription>
          Minimum compute requirements used when provisioning new environments for this agent.
        </CardDescription>
        {props.provider ? (
          <>
            <CardDescription>
              Published range: {ComputeProviderLimitsCatalog.formatPublishedRangeSummary(props.provider)}
            </CardDescription>
            <CardDescription>
              {ComputeProviderLimitsCatalog.getPublishedRangeDisclaimer()}
            </CardDescription>
          </>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <EditableField
          displayValue={`${requirements.minCpuCount} vCPU`}
          emptyValueLabel="No minimum CPU configured"
          fieldType="number"
          label="Minimum CPU"
          onSave={async (value) => {
            await saveRequirements({
              minCpuCount: Number.parseInt(value, 10),
            });
          }}
          value={String(requirements.minCpuCount)}
        />

        <EditableField
          displayValue={`${requirements.minMemoryGb} GB`}
          emptyValueLabel="No minimum memory configured"
          fieldType="number"
          label="Minimum memory"
          onSave={async (value) => {
            await saveRequirements({
              minMemoryGb: Number.parseInt(value, 10),
            });
          }}
          value={String(requirements.minMemoryGb)}
        />

        <EditableField
          displayValue={`${requirements.minDiskSpaceGb} GB`}
          emptyValueLabel="No minimum disk configured"
          fieldType="number"
          label="Minimum disk"
          onSave={async (value) => {
            await saveRequirements({
              minDiskSpaceGb: Number.parseInt(value, 10),
            });
          }}
          value={String(requirements.minDiskSpaceGb)}
        />
      </CardContent>
    </Card>
  );
}
