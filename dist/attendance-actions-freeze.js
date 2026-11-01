(function () {
  'use strict';

  const originalDailyAttendanceMarkup = dailyAttendanceMarkup;

  dailyAttendanceMarkup = function () {
    const host = document.createElement('div');
    host.innerHTML = originalDailyAttendanceMarkup();
    const table = host.querySelector('.attendanceDailyTable table');
    if (!table) return host.innerHTML;
    for (const row of host.querySelectorAll('.attendanceDailyTable tbody tr')) {
      const seen = new Set();
      for (const button of row.querySelectorAll('[data-attendance-status]')) {
        const status = button.dataset.attendanceStatus;
        if (seen.has(status)) button.remove();
        else seen.add(status);
      }
    }

    const headerRow = table.tHead && table.tHead.rows[0];
    if (headerRow && !headerRow.querySelector('.attendanceEditActionHead')) {
      const heading = document.createElement('th');
      heading.className = 'attendanceEditActionHead';
      heading.textContent = 'ACTIONS';
      headerRow.appendChild(heading);
    }

    table.tBodies[0]?.querySelectorAll('tr').forEach(function (row) {
      if (row.querySelector('.attendanceEditAction')) return;
      const staffId = row.cells[0]?.textContent?.trim();
      if (!staffId || row.cells.length < 2) return;
      const cell = document.createElement('td');
      cell.className = 'attendanceEditAction';
      cell.innerHTML = `<button type="button" class="attendanceEditButton" data-attendance-edit="${esc(staffId)}" aria-label="Edit attendance for ${esc(staffId)}">${icon('edit')}<span>Edit</span></button>`;
      row.appendChild(cell);
    });
    return host.innerHTML;
  };

  function openAttendanceEditor(staffId) {
    const staff = attendanceStaff().find(function (item) { return item.id === staffId; });
    if (!staff) return;
    const record = getDailyDraft()[staffId] || {};
    const currentStatus = normalizeAttendanceStatus(record.status);
    const options = ['Unmarked', 'Present', 'Half Day', 'Absent', 'Paid Leave', 'Weekly Off'];
    openModal('Edit Attendance', `<section class="attendanceEditDialog"><p><strong>${esc(staff.name)}</strong><br><small>${esc(staff.id)} · ${esc(attendanceSelectedDate)}</small></p><label>Attendance status<select id="attendanceEditStatus">${options.map(function (status) { return `<option value="${status}" ${status === currentStatus ? 'selected' : ''}>${status}</option>`; }).join('')}</select></label><label>Remarks / notes<textarea id="attendanceEditNote" placeholder="Optional note / overtime…">${esc(record.note || '')}</textarea></label></section><div class="formactions"><button type="button" class="btn secondary" data-action="cancel">Cancel</button><button type="button" class="btn attendanceEditSave" data-attendance-edit-save="${esc(staffId)}">${icon('check')}Save Changes</button></div>`);
  }

  document.addEventListener('click', function (event) {
    const edit = event.target.closest('[data-attendance-edit]');
    if (edit) {
      openAttendanceEditor(edit.dataset.attendanceEdit);
      return;
    }
    const saveEdit = event.target.closest('[data-attendance-edit-save]');
    if (!saveEdit) return;
    const staffId = saveEdit.dataset.attendanceEditSave;
    const draft = getDailyDraft();
    draft[staffId] = {
      ...(draft[staffId] || {}),
      status: normalizeAttendanceStatus(document.querySelector('#attendanceEditStatus')?.value),
      note: document.querySelector('#attendanceEditNote')?.value?.trim() || ''
    };
    closeModal();
    render();
  });

  render();
}());
