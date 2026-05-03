Use past-message commands when you need to inspect this agent's previous session transcript messages.
Call past_messages.list for newest-first paginated message metadata and contents; pass contentTypes to keep responses focused.
Call past_messages.get for one exact message by ID when you need the full stored payload.
Call past_messages.search for case-insensitive text matching across message_contents.text in this agent's own sessions.
Do not use this skill for agent-to-agent conversation delivery records; it reads session_messages only.
