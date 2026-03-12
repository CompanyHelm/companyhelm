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
    depends_on:
      - postgres
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

  frontend:
    image: {{FRONTEND_IMAGE}}
    depends_on:
      - api
    environment:
      COMPANYHELM_CONFIG_PATH: /run/companyhelm/config.yaml
      PORT: "{{UI_PORT}}"
    ports:
      - "{{UI_PORT}}:{{UI_PORT}}"
    volumes:
      - "{{FRONTEND_CONFIG_PATH}}:/run/companyhelm/config.yaml:ro"
    networks:
      - companyhelm

networks:
  companyhelm:
    driver: bridge

volumes:
  companyhelm_postgres_data:
