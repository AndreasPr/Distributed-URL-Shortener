"""Deny Supabase Data API roles access to backend-owned application objects."""

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_context().dialect.name != "postgresql":
        return
    op.execute("""
    DO $hardening$
    DECLARE
      target text;
      obj record;
      app_tables text[] := ARRAY['urls','analytics','api_keys','url_verdicts',
        'abuse_outbox','users','workspaces','workspace_members','workspace_invites',
        'alembic_version'];
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated')) THEN
        RETURN;
      END IF;
      -- PUBLIC grants are inherited by both roles; PostgreSQL has no DENY ACL.
      FOR target IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')
                    UNION ALL SELECT 'PUBLIC'
      LOOP
        FOR obj IN SELECT schemaname, tablename FROM pg_tables
                   WHERE schemaname = current_schema() AND tablename = ANY(app_tables)
        LOOP
          EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM %s',
            obj.schemaname, obj.tablename,
            CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
        END LOOP;
        FOR obj IN
          SELECT DISTINCT n.nspname, s.relname FROM pg_class s
          JOIN pg_namespace n ON n.oid = s.relnamespace
          JOIN pg_depend d ON d.objid = s.oid AND d.deptype IN ('a','i')
          JOIN pg_class t ON t.oid = d.refobjid
          WHERE s.relkind = 'S' AND n.nspname = current_schema()
            AND t.relname = ANY(app_tables)
        LOOP
          EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM %s',
            obj.nspname, obj.relname,
            CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
        END LOOP;
        FOR obj IN
          SELECT p.oid::regprocedure AS signature FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = current_schema()
            AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass
                            AND d.objid = p.oid AND d.deptype = 'e')
        LOOP
          EXECUTE format('REVOKE ALL PRIVILEGES ON ROUTINE %s FROM %s',
            obj.signature,
            CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
        END LOOP;
        -- Global defaults and schema additions must both be removed. Defaults
        -- apply to objects created by this migration/object-owner role only.
        EXECUTE format('ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM %s',
          CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
        EXECUTE format('ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM %s',
          CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
        EXECUTE format('ALTER DEFAULT PRIVILEGES REVOKE ALL ON FUNCTIONS FROM %s',
          CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM %s', current_schema(),
          CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM %s', current_schema(),
          CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM %s', current_schema(),
          CASE WHEN target = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(target) END);
      END LOOP;
    END $hardening$;
    """)


def downgrade():
    # Deliberately do not regrant privileges or disable RLS on rollback.
    pass
