DO $$
DECLARE
  runtime_role_name text := NULLIF(BTRIM(current_setting('app.runtime_role', true)), '');
BEGIN
  IF runtime_role_name IS NULL THEN
    RAISE NOTICE 'Skipping runtime role grants migration because app.runtime_role is not set.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role_name) THEN
    RAISE NOTICE 'Skipping runtime role grants migration because role % does not exist yet.', runtime_role_name;
    RETURN;
  END IF;

  EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA public FROM %I', runtime_role_name);
  EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I', runtime_role_name);
  EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I', runtime_role_name);
  EXECUTE format('REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM %I', runtime_role_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', runtime_role_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', runtime_role_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', runtime_role_name);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', runtime_role_name);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', runtime_role_name);
  EXECUTE format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO %I', runtime_role_name);
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
    runtime_role_name
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
    runtime_role_name
  );
END
$$;
