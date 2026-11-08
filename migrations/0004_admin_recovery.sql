CREATE TABLE IF NOT EXISTS app_admin_recovery (
 user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
 code_hash TEXT NOT NULL,
 credential_version INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS app_recovery_attempts (
 key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 expires INTEGER NOT NULL
);
