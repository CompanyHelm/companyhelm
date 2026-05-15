export type AgentAssignmentAgent = {
  id: string;
  name: string;
};

/**
 * Keeps the add-to-agents modal selection behavior consistent across skills, secrets, and MCP
 * servers. The modal defaults to every agent, but users can still make quick all/none changes or
 * toggle individual agents while preserving the same order the agent list displays.
 */
export class AgentAssignmentSelection {
  selectAll(agents: ReadonlyArray<AgentAssignmentAgent>): string[] {
    return agents.map((agent) => agent.id);
  }

  deselectAll(): string[] {
    return [];
  }

  toggleAgent(
    selectedAgentIds: ReadonlyArray<string>,
    agentId: string,
    agents: ReadonlyArray<AgentAssignmentAgent>,
  ): string[] {
    const selectedAgentIdSet = new Set(selectedAgentIds);
    if (selectedAgentIdSet.has(agentId)) {
      selectedAgentIdSet.delete(agentId);
    } else {
      selectedAgentIdSet.add(agentId);
    }

    return agents
      .filter((agent) => selectedAgentIdSet.has(agent.id))
      .map((agent) => agent.id);
  }

  areAllSelected(
    selectedAgentIds: ReadonlyArray<string>,
    agents: ReadonlyArray<AgentAssignmentAgent>,
  ): boolean {
    if (agents.length === 0) {
      return false;
    }

    const selectedAgentIdSet = new Set(selectedAgentIds);
    return agents.every((agent) => selectedAgentIdSet.has(agent.id));
  }
}
