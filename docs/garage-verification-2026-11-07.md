# Garage workflow verification — 7 November 2026

## Decision

Core live dummy workflow passed, but **unrestricted production readiness is not yet signed off**. Three fixes described below are local and require deployment and live retesting. An expenses discrepancy between two tabs and intermittent initial-click behavior remain unresolved. Real-device offline and independent-user concurrency tests remain outstanding.

## Live workflow results

The existing signed-in Admin session on https://the-doctor-bike.pages.dev was used. Only records labelled TEST QA were created or changed. No WhatsApp message, actual bank payment, physical print or permanent purge was performed.

| Check | Result / evidence |
| --- | --- |
| Customer create and reload | PASS — BD-CUST-1003 persisted |
| Vehicle linked to customer | PASS — BD-VEH-1002, TEST-QA-1107 persisted |
| Spare part creation | PASS — BD-PRT-1002 persisted |
| Godown purchase | PASS — BD-PUR-1002, 5 × ₹100 + 18% GST = ₹590 |
| Transfer selected purchase lot | PASS — MOV-00001 moved 3; Godown 2, Main 3 |
| Prevent transfer while Main has stock | PASS — a second transfer was rejected with “Transfer is available after Main Stock reaches zero.” |
| Job card and stock consumption | PASS — BD-JOB-1002 used 1 part; Main became 2 |
| Job total | PASS — labour ₹300 + part ₹200 + miscellaneous ₹50 + GST ₹90 = ₹640 |
| Reload job data | PASS — saved job retained its details |
| Thermal preview | PASS — miscellaneous ₹50 and line GST rates appeared; total ₹640 |
| Thermal → A5 button | FAIL live — missing click handler; local fix and regression test added |
| Test receipt | PASS — ₹100 against job; paid ₹100, due ₹540 after reload |
| Counter sale | PASS — BD-SALE-1001, 1 × ₹200, Non-GST, unpaid; Main became 1 |
| Sales report | PASS — counter sale included alongside job parts |
| Profit report | PASS — QA job net ₹550 less part cost ₹100 = ₹450 |
| Dashboard | PASS for tested revenue — total ₹2,810, dues ₹2,710; today's net ₹750 including miscellaneous ₹50 |
| Payment export | PASS — exported column sequence matched visible table, Actions excluded; job ₹640 / paid ₹100 / due ₹540 |
| Linked customer deletion | PASS — blocked, listing vehicle, job and sale dependencies |
| Recycle Bin deletion | PASS — dummy sale appeared after server save completed |
| Recycle Bin restore | PASS — dummy sale returned and Main reverted from 2 to 1; confirmation initially delayed in browser automation |
| Staff create and reload | PASS persistence — BD-STF-1002, monthly ₹15,000, Sunday off, PL allowance 2 |
| Paid leave marking | PASS persistence — QA staff PL on 7 November survived reload and counted as one paid leave |
| Staff historical isolation | FAIL live — newly created BD-STF-1002 inherited P on 3 November and H on 4 November, neither entered during this verification |

## Fixes prepared locally

1. Thermal preview now wires both A4 and A5 buttons with the explicitly selected paper size.
2. Transfers retain their purchase-line GST and GST-inclusive cost. Historical transfers missing the saved rate resolve it from their own referenced purchase line. An unknown tax rate is shown as unknown rather than treating it as zero. The QA transfer should display 18% and ₹118/unit, rather than the live ₹100/unit.
3. New Staff IDs skip IDs present in attendance history. The server rejects creation using an ID already present in historical attendance. Existing historical records are preserved. This prevents future ID reuse; it does not silently rewrite the already contaminated QA staff history.
4. Delete confirmation no longer falsely says cloud deletion affects only browser-local sample records.
5. Repaired the permissions test loader so it runs with the current module imports.

Script revisions were updated in index.html. No D1 data migration is needed for these code changes.

## Automated validation

`node --test tests/*.test.cjs functions/app-permissions.test.mjs` — **76 passed, 0 failed**.

Coverage includes offline queue behavior, permission enforcement, session loading, salary and paid leave rules, settings storage fallback, thermal invoice contents, relational deletion, real SQLite recycle/restore roundtrips, purchase-line transfer pricing and staff ID reuse protection. These automated checks do not replace an independent mobile/offline trial.

## Remaining verification / issues

- Expenses showed ₹10,100 in the original tab and ₹25,000 in the second tab after reload. This test did not create expense records. Cause remains unverified; do not rely on a financial readiness sign-off yet.
- Some first clicks just after navigation/loading had no effect or a shifted target. Retrying after reading the settled UI worked. Deferred scroll restoration and background rendering need a focused reproduction; cause is not proven.
- Independent non-admin login, concurrent users on separate devices, and real network-loss → queued synchronization were not tested live because the available authenticated session was Admin and browser controls did not expose network-offline simulation. Server policy/queue tests passed locally.
- No full live backup restore was attempted, since it would overwrite records outside the QA dataset.
- Insurance uploads, AMC/reminder delivery, physical printers, and every role/sub-action were not exhaustively exercised live in this session.
- Deploy the fixes, retest A5, transfer tax and a new staff identity, then investigate the expenses discrepancy before ordinary garage use.

## Dummy records retained for review

| Record | ID / reference |
| --- | --- |
| Customer | BD-CUST-1003 — TEST QA 20261107 CUSTOMER |
| Vehicle | BD-VEH-1002 — TEST-QA-1107 |
| Part | BD-PRT-1002 — TEST QA 20261107 FILTER |
| Purchase | BD-PUR-1002 — invoice TEST-QA-20261107, ₹590 unpaid |
| Transfer | MOV-00001 — TEST-QA-20261107 transfer, quantity 3 |
| Job | BD-JOB-1002 — ₹640, Pending |
| Receipt | Reference TEST-QA-NO-REAL-PAYMENT — ₹100, no actual money received |
| Counter sale | BD-SALE-1001 — ₹200 unpaid; deleted and then restored |
| Staff | BD-STF-1002 — TEST QA 20261107 STAFF; historical attendance collision noted above |
| Attendance | QA staff Paid Leave on 2026-11-07 |

These records currently affect live reports and stock. QA billed value is ₹840, recorded test receipt ₹100, remaining QA due ₹740; QA stock is Main 1 + Godown 2. Remove/reverse them through the normal linked-record workflow after review. Do not purge or blanket-reset existing data. The inherited November 3/4 attendance must not be silently reassigned or deleted.
