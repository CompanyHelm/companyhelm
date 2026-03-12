BEGIN;

INSERT INTO companies (id, name)
VALUES ('{{COMPANY_ID}}', '{{COMPANY_NAME}}')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

UPDATE users
SET first_name = '{{USER_FIRST_NAME}}',
    last_name = NULL,
    email = '{{USER_EMAIL}}',
    auth_provider = 'companyhelm',
    updated_at = NOW()
WHERE id = '{{USER_ID}}'
   OR email = '{{USER_EMAIL}}';

INSERT INTO users (id, first_name, last_name, email, auth_provider, created_at, updated_at)
SELECT
  '{{USER_ID}}',
  '{{USER_FIRST_NAME}}',
  NULL,
  '{{USER_EMAIL}}',
  'companyhelm',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM users
  WHERE id = '{{USER_ID}}'
     OR email = '{{USER_EMAIL}}'
);

UPDATE user_auths
SET user_id = '{{USER_ID}}',
    email = '{{USER_EMAIL}}',
    password_salt = '{{PASSWORD_SALT}}',
    password_hash = '{{PASSWORD_HASH}}',
    updated_at = NOW()
WHERE user_id = '{{USER_ID}}'
   OR email = '{{USER_EMAIL}}';

INSERT INTO user_auths (id, user_id, email, password_salt, password_hash, created_at, updated_at)
SELECT
  '{{USER_AUTH_ID}}',
  '{{USER_ID}}',
  '{{USER_EMAIL}}',
  '{{PASSWORD_SALT}}',
  '{{PASSWORD_HASH}}',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM user_auths
  WHERE user_id = '{{USER_ID}}'
     OR email = '{{USER_EMAIL}}'
);

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
