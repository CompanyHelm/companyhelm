services:
  postgres:
    image: {{POSTGRES_IMAGE}}
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: companyhelm
{{POSTGRES_PORTS_BLOCK}}
    volumes:
      - companyhelm_postgres_data:/var/lib/postgresql/data
      - "{{SEED_FILE_PATH}}:/run/companyhelm/seed.sql:ro"
    networks:
      - companyhelm

{{API_SERVICE_BLOCK}}

{{FRONTEND_SERVICE_BLOCK}}

networks:
  companyhelm:
    driver: bridge

volumes:
  companyhelm_postgres_data:
