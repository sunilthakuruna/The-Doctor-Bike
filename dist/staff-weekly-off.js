'use strict';
/* Per-staff weekly off rules for attendance-based salary estimates. */
const weeklyOffField = {key:'weeklyOffDay',label:'Weekly Off Day',type:'select',options:['None','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],default:'Sunday'};
const salaryTypeIndex = schemas.staff.findIndex(field => field.key === 'salaryType');
if (salaryTypeIndex >= 0 && !schemas.staff.some(field => field.key === 'weeklyOffDay')) schemas.staff.splice(salaryTypeIndex + 1, 0, weeklyOffField);
const attendanceSalaryBeforeWeeklyOff = attendanceSalaryEstimate;
attendanceSalaryEstimate = function (staff, counts, days) {
  if (String(staff.salaryType || '').trim().toLowerCase() !== 'monthly') return attendanceSalaryBeforeWeeklyOff(staff, counts, days);
  const amount = Number(staff.salary || 0), offDay = staff.weeklyOffDay || 'Sunday';
  const offIndex = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(offDay);
  const workingDates = days.filter(day => offIndex < 0 || new Date(day.date + 'T12:00:00').getDay() !== offIndex);
  const payableWorkingDays = workingDates.reduce((total, day) => {
    const status = normalizeAttendanceStatus(attendanceFor(day.date, staff.id).status);
    return total + (status === 'Present' ? 1 : status === 'Half Day' ? 0.5 : 0);
  }, 0);
  const dailyRate = workingDates.length ? amount / workingDates.length : 0;
  return {dailyRate, estimated: dailyRate * payableWorkingDays, label:'Monthly salary ÷ scheduled working days × payable days'};
};
const monthlyMarkupBeforeWeeklyOff = monthlyAttendanceMarkup;
monthlyAttendanceMarkup = function () {
  return monthlyMarkupBeforeWeeklyOff().replace(
    'monthly salary is prorated by payable attendance days;',
    'monthly salary is prorated over scheduled working days after excluding each staff member’s weekly off;'
  );
};

render();
