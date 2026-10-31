# BIKE DOCTOR — garage management prototype

This clean package is based on the recovered editable prototype, with its supporting scripts and styles kept together. It is an independent BIKE DOCTOR implementation informed by the user's requested workflows and authorized screen observations. It does not include the demo's source code or credentials.

## Open the prototype locally

Open `dist/index.html` in a browser. For hosted preview, upload the contents of `dist/` (not the parent folder) to a static host. `BIKE-DOCTOR-fresh-deploy.zip` is arranged with `index.html` at the archive root for this purpose.

## GitHub Pages

This repository is ready for GitHub Pages. Push the `main` branch, then open the repository's **Settings → Pages** screen and select **GitHub Actions** as the source. The included workflow publishes the `dist/` folder automatically after each push.

The repository does not require Node.js, npm, a build command, or a server. It is a static HTML, CSS, and JavaScript application.

## Included modules

Dashboard; Business Settings; List Management; Customer Master; Vehicle Master; Insurance; Staff Master; Staff Attendance; Per Job Salary; Service Master; Account Master; Appointment Booking; Job Card; Spare Parts/Main Stock; Godown Stock; Spare Parts Sale; Purchases; Payment Entry; Reports (Sales, Purchase, Outstanding Dues, Profit, Collection, Stock Verification and Vendor-wise Spare Parts Purchases); Expenses; Users; Audit Logs; Vehicle Service Reminders; AMC Expiry Reminders.

## Requested workflows represented

- Responsive desktop and phone layouts, garage-style color theme, grouped side navigation, quick actions, horizontal table scrolling, column visibility controls and configurable page size.
- Customer and two-wheeler vehicle records; linked make/model lists; per-vehicle AMC and service reminders; insurance company, due alerts and attached policy files.
- Job cards with customer/vehicle creation, prior billing context, status colors, services and parts, separate per-line labour/part discounts, GST and Non-GST billing, and invoice actions.
- Main and Godown stock using the same part records, purchase destination, transfers, purchase dates/costs, vendor links and physical stock verification.
- Purchasing, counter sales, payments, expenses, account records, report filters, import/export templates with example rows, and DD/MM/YYYY display.
- Custom invoice template controls, paper size configuration including thermal widths, print preview, business logo/stamp/UPI fields, and GST/Non-GST invoice settings.
- Staff identification fields, user password setup with show/hide, four-character minimum in the local prototype, module permission controls, system ID prefixes, and activity log.
- Document/image uploads where requested and WhatsApp invoice/policy sharing actions.

## Prototype limits

This is a browser-local review prototype, not a production service. Data is stored in the browser; it is not shared across devices and production authentication/permission enforcement is not connected. The password form is not a production account system. Excel exchange is CSV-compatible rather than native `.xlsx`. Print support uses browser print styles and still needs testing with the target printer hardware. WhatsApp links can prepare text and open WhatsApp, but browsers do not permit an ordinary webpage to silently attach several local files in a single click; the user may need to attach files in WhatsApp. Google Drive backup requires a configured OAuth client and a hosted/localhost origin and is not an automatic live sync. Tax configuration should be verified by the garage's tax professional before production use.

## Verification

All JavaScript files pass Node syntax checks, and the HTML's local script/style references are checked to exist. The in-app browser policy blocked local-file/localhost preview in this task, so this package has not been claimed as visually verified in that browser. Use the HTTPS hosted deployment for visual review and compare each module screen-by-screen.

## Dashboard visual alignment

Updated to match the supplied demo recording: six colored summary tiles in a three-column/two-row grid, two dashboard charts side-by-side on tablet/desktop, a paired lower chart and Quick Access row, and Quick Access buttons arranged in three columns with distinct icon colors. On narrow phone screens the cards use two columns and charts stack vertically.

## Admin account deletion

The final active Admin account is protected from deletion. Add another active Admin in Users first; the earlier Admin can then be deleted. The delete control is visibly disabled while it would remove the last active Admin, and the delete handler checks the same rule.

Staff Master now supports a single profile photo per staff record, with JPG/PNG/WebP selection, preview, replace/remove, automatic image resizing, and a thumbnail beside the staff name in the list.

## Restore points and backups

The prototype keeps up to five recent restore points in this browser and creates one before saving each change. Settings includes a button to create a point manually and controls to restore a selected point. A restore preserves the current workspace as a new point before applying the older data. Restore points stay in the same browser profile and can be limited by browser storage; use the existing Download Database (JSON) backup to keep a separate copy. A pre-change ZIP is also included at `BIKE-DOCTOR-before-restore-points.zip`.

Staff records now support separate Aadhaar / national ID and driving-licence attachments in PDF, JPG, PNG or WebP format (up to 1 MB each). Files save with the staff record; staff profile photos remain a separate field. Use the earlier `BIKE-DOCTOR-fresh-staff-attachments-removed.zip` as a rollback point for this addition.

Pagination controls are compact across paginated record and report tables: the row-count selector uses a short “Rows” label, page counts use a compact format, and the buttons and bar use reduced height. Controls wrap neatly on narrow screens.

## Staff attendance

Daily Attendance Marking now follows the demo workflow with date navigation, staff search, Present / Half Day / Absent quick marks, per-person remarks, colored summary cards and an explicit save indicator. Monthly Matrix & Payroll provides month/year selection, a horizontally scrollable editable daily matrix, attendance totals, estimated salary, CSV export and a print sheet. Both views share the browser-local attendance records. Monthly salary is prorated by payable attendance days; daily salary uses payable days; per-job pay uses completed/delivered job labour for that month.

Every staff row in Monthly Matrix & Payroll now has one date tile for each day in the selected month (28–31 tiles as appropriate). Each tile shows the calendar day above its attendance mark and is color-coded for Present, Half Day or Absent; unmarked dates remain neutral. Scroll horizontally to reach the full month.

Monthly Attendance Sheet now includes editable paper size (A3, A4, A5, Letter or Legal) and orientation (landscape or portrait), with saved preferences. The browser print window remains where the user chooses the actual printer device.

Attendance estimated salary now reads the salary type and rate from each Staff Master record. The month view and Excel export share one calculation: monthly salary is prorated by payable attendance days in the calendar month, daily salary is multiplied by payable days (half days count as 0.5), and per-job percentage is applied to completed/delivered job labour for the selected month. The month view explains these rules.

Staff Attendance now has a visible Edit action on each row in Daily Attendance Marking. It opens the selected staff member's saved record for the chosen date, allows changing status or remarks, and saves the change immediately. Past dates can be edited using the date control.

Staff Master now includes a per-staff Weekly Off Day (Sunday by default, or None/another weekday). Monthly salary estimates divide the Staff Master monthly amount by scheduled working days after excluding that staff member's weekly off, then multiply by payable attendance (Present = 1, Half Day = 0.5). Daily pay and per-job commission keep their respective criteria.

Attendance & Leave Criteria supports a shared weekly-off day or per-person weekly offs, plus a paid-leave allowance per month. Daily marking and monthly tiles support Paid Leave (PL) and Weekly Off (WO); paid leave is payable within the staff allowance, and Weekly Off is payable for salary.

Weekly Off (WO) does not reduce monthly pay and counts as payable for daily salary. Existing Unpaid Leave records are recognized as Weekly Off for display and salary calculations.

### Attendance sign-off

Attendance now includes a date-specific sign-off section. Each active User Management account can sign off once per attendance date after attendance is saved; the account name and sign-off time are saved and shown on that date. This is a demo record only because the prototype does not authenticate logins.


Service Master no longer includes Estimated Duration in the form or list. The service import template also omits that field.
