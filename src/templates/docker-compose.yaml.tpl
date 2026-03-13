services:
  postgres:
    image: {{POSTGRES_IMAGE}}
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: companyhelm
    volumes:
      - companyhelm_postgres_data:/var/lib/postgresql/data
      - "{{SEED_FILE_PATH}}:/run/companyhelm/seed.sql:ro"
    networks:
      - companyhelm

  api:
    image: {{API_IMAGE}}
    platform: linux/amd64
    depends_on:
      - postgres
    env_file:
      - "{{API_ENV_PATH}}"
    environment:
      COMPANYHELM_CONFIG_PATH: /run/companyhelm/config.yaml
    ports:
      - "{{API_HTTP_PORT}}:4000"
      - "{{RUNNER_GRPC_PORT}}:{{RUNNER_GRPC_PORT}}"
      - "{{AGENT_CLI_GRPC_PORT}}:{{AGENT_CLI_GRPC_PORT}}"
    volumes:
      - "{{API_CONFIG_PATH}}:/run/companyhelm/config.yaml:ro"
    networks:
      - companyhelm

{{FRONTEND_SERVICE_BLOCK}}

networks:
  companyhelm:
    driver: bridge

volumes:
  companyhelm_postgres_data:
