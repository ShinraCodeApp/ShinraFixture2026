-- ShinraFixture 2026 - Database Initialization
-- PostgreSQL 16

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- For accent-insensitive search

-- Create indexes for full-text search after Prisma migrations run
-- These are additional performance indexes

-- Performance optimization settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';

-- Create read replica role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'shinra_readonly') THEN
    CREATE ROLE shinra_readonly;
    GRANT CONNECT ON DATABASE shinra_db TO shinra_readonly;
    GRANT USAGE ON SCHEMA public TO shinra_readonly;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO shinra_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO shinra_readonly;
  END IF;
END $$;

-- Notify completion
DO $$ BEGIN RAISE NOTICE 'Database initialization complete'; END $$;
