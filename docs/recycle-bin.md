# Recycle Bin

After deploying the updated Pages Functions and app files, sign in as Admin and open **Recycle Bin** under Finance & Reports. D1 creates its archive tables and delete triggers automatically; do not paste filenames into the D1 SQL console.

Supported deletions: customers, vehicles, services, staff (including identity attachments), expenses, and individual records removed from the inventory, insurance, AMC, service-reminder, and stock-verification snapshots. Existing Job Card/Sale archives are imported into this list.

Accounts and user accounts currently use **Inactive**, not deletion. Attendance edits, settings changes and audit logs are not deleted business entries and are not placed in this bin. Passwords and login sessions are never archived here. Records permanently deleted before this deployment cannot be recovered.

Dedicated record deletions capture their full server record within the same D1 transaction. Snapshot archives are committed only if the snapshot version update succeeds. The list API exposes metadata, not identity documents or the archived payload. Only an active Admin can list, restore or permanently delete through the API; assigning module permissions cannot grant this right.

Restore master records before their dependent entries. Restore rejects duplicate IDs/vehicle numbers, missing linked customers/vehicles/staff/accounts/parts/services, insufficient stock and negative stock. The original IDs and line values are preserved. Restoring bills changes current stock and balances. Accounts must be reactivated through Account Master.

Restoration and permanent deletion require an internet connection. Refresh after a version conflict. The app reloads authoritative cloud data after restoration. Permanent deletion erases the archived payload and any corresponding legacy archive; a metadata tombstone and audit event remain to prevent repeat restoration/import.

Before production rollout, run `node --test tests/*.test.cjs`. Test on a preview D1 database with dummy data: delete an unlinked entry, confirm its metadata in the bin, restore it, refresh in another signed-in Admin browser, and verify a non-Admin receives no access.
