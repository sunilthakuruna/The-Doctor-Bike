'use strict';
/* Explicit row-level editor for saved attendance on the selected date. */
const dailyAttendanceBeforeEdit = dailyAttendanceMarkup;
dailyAttendanceMarkup = function () {
  const host = document.createElement('div');
  host.innerHTML = dailyAttendanceBeforeEdit();
  for (const group of host.querySelectorAll('.attendanceChoices')) {
    const seen = new Set();
    for (const button of group.querySelectorAll('[data-attendance-status]')) {
      const status = button.dataset.attendanceStatus;
      if (seen.has(status)) button.remove();
      else seen.add(status);
    }
  }
  const table = host.querySelector('.attendanceDailyTable table');
  if (!table) return host.innerHTML;
  const head = table.tHead && table.tHead.rows[0];
  if (head) {
    const th = document.createElement('th');
    th.className = 'attendanceEditActionHead';
    th.textContent = 'ACTIONS';
    head.appendChild(th);
  }
  for (const row of table.tBodies[0]?.rows || []) {
    if (row.querySelector('.empty')) {
      row.cells[0].colSpan = 7;
      continue;
    }
    const id = row.cells[0]?.textContent.trim();
    const cell = row.insertCell(-1);
    cell.className = 'attendanceEditAction';
    cell.innerHTML = '<button type="button" class="btn secondary small attendanceEditButton" data-attendance-edit="' + esc(id) + '" title="Edit saved attendance">Edit</button>';
  }
  return host.innerHTML;
};
function openAttendanceEdit(staffId) {
  const staff = db.staff.find(person => person.id === staffId);
  if (!staff) return;
  const saved = attendanceFor(attendanceSelectedDate, staffId);
  const status = normalizeAttendanceStatus(saved.status);
  const statuses = [['Unmarked', 'Not marked'], ['Present', 'Present'], ['Half Day', 'Half Day'], ['Absent', 'Absent'], ['Paid Leave', 'Paid Leave'], ['Weekly Off', 'Weekly Off']];
  const options = statuses.map(item => '<option value="' + item[0] + '"' + (status === item[0] ? ' selected' : '') + '>' + item[1] + '</option>').join('');
  openModal('Edit Attendance — ' + esc(staff.name), '<form id="attendanceEditForm"><div class="formbody"><p class="muted">Editing ' + esc(staff.name) + ' · ' + esc(attendanceSelectedDate) + '</p><label class="field"><span>Attendance Status</span><select name="status">' + options + '</select></label><label class="field"><span>Remarks / Notes</span><textarea name="note" rows="3">' + esc(saved.note || '') + '</textarea></label></div><div class="formactions"><button type="button" class="btn secondary" data-action="cancel">Cancel</button><button type="submit" class="btn">Save Attendance</button></div></form>');
  document.querySelector('#attendanceEditForm').onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget), nextStatus = form.get('status'), note = String(form.get('note') || '').trim();
    const previous = db.attendance[attendanceSelectedDate] ? structuredClone(db.attendance[attendanceSelectedDate]) : null;
    const dateRecords = { ...(db.attendance[attendanceSelectedDate] || {}) };
    if (nextStatus === 'Unmarked' && !note) delete dateRecords[staffId];
    else dateRecords[staffId] = { ...(dateRecords[staffId] || {}), status: nextStatus, note };
    if (Object.keys(dateRecords).length) db.attendance[attendanceSelectedDate] = dateRecords;
    else delete db.attendance[attendanceSelectedDate];
    audit('Update', 'Attendance edited · ' + attendanceSelectedDate + ' · ' + staffId);
    if (save('Attendance updated') === false) {
      if (previous) db.attendance[attendanceSelectedDate] = previous;
      else delete db.attendance[attendanceSelectedDate];
      db.audit.shift();
      return;
    }
    attendanceDailyDrafts[attendanceSelectedDate] = structuredClone(db.attendance[attendanceSelectedDate] || {});
    closeModal();
    render();
  };
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-attendance-edit]');
  if (!button) return;
  event.preventDefault();
  openAttendanceEdit(button.dataset.attendanceEdit);
});
