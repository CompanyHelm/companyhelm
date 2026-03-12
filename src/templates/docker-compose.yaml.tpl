services:
  postgres:
    image: {{POSTGRES_IMAGE}}
    networks:
      - companyhelm

  api:
    image: {{API_IMAGE}}
    depends_on:
      - postgres
    ports:
      - "{{RUNNER_GRPC_PORT}}:{{RUNNER_GRPC_PORT}}"
      - "{{AGENT_CLI_GRPC_PORT}}:{{AGENT_CLI_GRPC_PORT}}"
    networks:
      - companyhelm

  frontend:
    image: {{FRONTEND_IMAGE}}
    depends_on:
      - api
    ports:
      - "{{UI_PORT}}:{{UI_PORT}}"
    networks:
      - companyhelm

networks:
  companyhelm:
    driver: bridge
