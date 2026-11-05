-- Server identity is separate from browser profile snapshots.
-- Existing owner credentials remain available during the login transition.
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Inactive')),
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 100000,
  permissions TEXT NOT NULL DEFAULT '{}',
  action_restrictions TEXT NOT NULL DEFAULT '{}',
  credential_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS app_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  credential_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  device_label TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expiry ON app_sessions(expires_at);

-- Preserve the configured administrator's credentials for the transition.
-- No passwords or password hashes are sent to the browser.
INSERT OR IGNORE INTO app_users(id,username,name,role,status,salt,password_hash)
SELECT 'primary-admin',email,'Administrator','Admin','Active',salt,password_hash
FROM owner_account WHERE id=1;
