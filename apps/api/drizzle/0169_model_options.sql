ALTER TABLE "model_provider_credential_models" ADD COLUMN "model_options" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "agents" ADD COLUMN "default_model_options" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "agent_sessions" ADD COLUMN "current_model_options" jsonb DEFAULT '{}'::jsonb NOT NULL;

UPDATE "model_provider_credential_models" SET "model_options" = '[
  {
    "key": "serviceTier",
    "name": "Service tier",
    "description": "Choose the provider routing speed and cost tier for this model.",
    "type": "select",
    "category": "routing",
    "defaultValue": null,
    "options": [
      { "name": "Standard", "value": null, "description": "Use the provider default routing tier." },
      { "name": "Fast", "value": "priority", "description": "Faster responses with higher usage cost when supported by the provider." },
      { "name": "Flex", "value": "flex", "description": "Lower-cost, flexible routing when supported by the provider." }
    ]
  }
]'::jsonb
WHERE "model_id" LIKE 'gpt-%';
