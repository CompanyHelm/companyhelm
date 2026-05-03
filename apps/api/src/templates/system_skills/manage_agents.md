Use agent management commands only when the user asks to inspect or change persisted company agent configuration.
Call agent.list before creating or updating agents when you need model, credential, compute provider, template, or secret IDs.
Call agent.skills.list before changing an agent's skill defaults so you can see the current direct skill and skill-group assignments.
Call agent.mcps.list before changing MCP defaults or when you need to inspect the MCP servers attached to one agent.
Only send fields that should change when updating an agent.
