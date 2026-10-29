-- Apply once to the dedicated ANALYTICS_DB D1 binding before enabling collection.
-- No CRM/prospect IDs, PII, raw URLs, IPs, user agents or request bodies are stored.
CREATE TABLE IF NOT EXISTS analytics_events (
  event_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('production', 'staging')),
  name TEXT NOT NULL,
  visitor_id TEXT,
  source TEXT NOT NULL,
  campaign TEXT NOT NULL,
  medium TEXT NOT NULL,
  path TEXT NOT NULL,
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY (environment, event_id)
) STRICT;
CREATE INDEX IF NOT EXISTS analytics_env_time ON analytics_events(environment, recorded_at);
CREATE INDEX IF NOT EXISTS analytics_env_name_time ON analytics_events(environment, name, recorded_at);
CREATE INDEX IF NOT EXISTS analytics_time ON analytics_events(recorded_at);
