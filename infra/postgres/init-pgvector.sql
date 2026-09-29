-- HomeIQ PostgreSQL 16 + pgvector Initialization Script
-- Automatically executed on first container boot via /docker-entrypoint-initdb.d/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
