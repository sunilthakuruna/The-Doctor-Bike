# Administrator recovery deployment

1. Push this commit, merge it into the production branch, and wait for Cloudflare deployment success.
2. In Cloudflare D1, open **bike-doctor-production → Console**. Paste the SQL contents below, not a filename, and choose Execute. This adds recovery tables without changing business records.

```sql
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
```

The same SQL is in `migrations/0004_admin_recovery.sql` for migration tooling.

3. Sign in online as the administrator. Open **User Management → Admin Recovery Code**. Confirm the current password and generate the code.
4. Choose **Download Code & Step-by-Step Guide**. Upload that private text file to Google Drive manually, with sharing disabled. The file includes the actual account name, app address, replacement code, and recovery instructions. No code is automatically written to browser storage, Google Drive, logs, or business backups. D1 retains only its hash.
5. To recover: at Sign In choose **Recover Admin Access**, enter the administrator username and the saved code, then enter and confirm a new password. Download the replacement guide, replace the old Drive file, and sign in online with the new password.

Recovery requires an internet connection and a code generated before lockout. It does not recover the previous password. Recovery codes are single-use, and generating a replacement or changing the password invalidates the old code. Online sessions become invalid through credential-version checking. The primary administrator's legacy owner password is also replaced and legacy owner sessions are removed. Already-offline devices retain their existing offline authorization until they reconnect or it expires; recovery cannot remotely erase an offline device.

If both password and code are lost, another active administrator can set a new password using User Management. Otherwise authorized Cloudflare database recovery is required. Do not delete the application or D1 database.

Verification: SQLite integration tests cover administrator-only generation, current-password confirmation, cross-origin rejection, code hashing and rotation, old-code rejection, password updates, session invalidation, unchanged passwords on failed recovery, and attempt limiting. Real deployment and private Google Drive upload are separate user steps.
