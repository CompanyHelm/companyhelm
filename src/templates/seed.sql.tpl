BEGIN;

INSERT INTO companies (id, name)
VALUES ('{{COMPANY_ID}}', '{{COMPANY_NAME}}')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO users (id, first_name, last_name, email, auth_provider, created_at, updated_at)
VALUES (
  '{{USER_ID}}',
  '{{USER_FIRST_NAME}}',
  NULL,
  '{{USER_EMAIL}}',
  'companyhelm',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET first_name = EXCLUDED.first_name,
    auth_provider = EXCLUDED.auth_provider,
    updated_at = NOW();

INSERT INTO user_auths (id, user_id, email, password_salt, password_hash, created_at, updated_at)
VALUES (
  '{{USER_AUTH_ID}}',
  '{{USER_ID}}',
  '{{USER_EMAIL}}',
  '{{PASSWORD_SALT}}',
  '{{PASSWORD_HASH}}',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    password_salt = EXCLUDED.password_salt,
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

INSERT INTO company_members (company_id, user_id)
VALUES ('{{COMPANY_ID}}', '{{USER_ID}}')
ON CONFLICT (company_id, user_id) DO NOTHING;

INSERT INTO agent_runners (id, company_id, secret_hash, status, name)
VALUES (
  '{{RUNNER_ID}}',
  '{{COMPANY_ID}}',
  '{{RUNNER_SECRET_HASH}}',
  'ready',
  '{{RUNNER_NAME}}'
)
ON CONFLICT (id) DO UPDATE
SET company_id = EXCLUDED.company_id,
    secret_hash = EXCLUDED.secret_hash,
    status = EXCLUDED.status,
    name = EXCLUDED.name;

COMMIT;
