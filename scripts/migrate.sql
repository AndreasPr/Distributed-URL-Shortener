CREATE TABLE IF NOT EXISTS urls (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE,
    long_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(10) NOT NULL,
    clicked_at TIMESTAMP DEFAULT NOW()
);

-- Composite index for analytics queries: filter by short_code, order by clicked_at DESC
-- Enables efficient range queries: SELECT clicked_at FROM analytics WHERE short_code = ? ORDER BY clicked_at DESC
-- Without: PostgreSQL fetches all matching rows then sorts (O(n log n))
-- With: PostgreSQL uses index scan directly for sorted result (O(log n) lookup + sequential read)
CREATE INDEX IF NOT EXISTS idx_analytics_short_code_clicked_at ON analytics(short_code, clicked_at DESC);

-- Foreign key constraint for data integrity and cascading deletes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_analytics_short_code'
    ) THEN
        ALTER TABLE analytics ADD CONSTRAINT fk_analytics_short_code
          FOREIGN KEY (short_code) REFERENCES urls(short_code) ON DELETE CASCADE;
    END IF;
END $$;