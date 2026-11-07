'use strict';
/* Attendance-wide or individual weekly-off rules and configurable paid leave. */
const attendanceCriteriaDays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const attendanceWeeklyOffField=schemas.staff.find(field=>field.key==='weeklyOffDay');
if(attendanceWeeklyOffField){attendanceWeeklyOffField.label='Weekly Off Day (Individual)';attendanceWeeklyOffField.options=['Use Global','None',...attendanceCriteriaDays];attendanceWeeklyOffField.default='Use Global'}
if(!schemas.staff.some(field=>field.key==='paidLeaveDaysPerMonth')){const at=schemas.staff.findIndex(field=>field.key==='weeklyOffDay');schemas.staff.splice(at>=0?at+1:schemas.staff.findIndex(field=>field.key==='salaryType')+1,0,{key:'paidLeaveDaysPerMonth',label:'Paid Leave Allowance / Month',type:'number',default:0})}
for(const field of schemas.staff)if(['salary','paidLeaveDaysPerMonth'].includes(field.key))field.integer=true;
function staffSalaryEntryHint(type){
  if(type==='Monthly')return 'Monthly: Enter the full monthly salary in rupees, not a percentage. Example: 15000 = ₹15,000 per month. Attendance, weekly off and paid leave allowance determine payable salary.';
  if(type==='Per Job')return 'Per Job: Enter a whole-number percentage from 0 to 100. Example: 50 = 50% of Service / Labour on assigned Completed or Delivered Job Cards. Spare Parts, Miscellaneous items and GST are excluded.';
  if(type==='Daily')return 'Daily: Enter the salary per payable day in rupees. Example: 500 = ₹500 per payable day.';
  return 'Choose Salary Type: Monthly = monthly salary in rupees; Daily = rupees per payable day; Per Job = Service / Labour percentage. Enter whole numbers only.';
}
if(typeof field==='function'){
  const staffSalaryFieldBeforeHint=field;
  field=function(config,record={}){
    const html=staffSalaryFieldBeforeHint(config,record);
    return config.key==='salary'&&schemas.staff.includes(config)?html.replace('</label>','<small data-staff-salary-hint>'+staffSalaryEntryHint(record.salaryType)+'</small></label>'):html;
  };
}
if(typeof document!=='undefined')document.addEventListener('change',event=>{
  if(event.target.name!=='salaryType')return;
  const hint=event.target.closest('form')?.querySelector('[data-staff-salary-hint]');
  if(hint)hint.textContent=staffSalaryEntryHint(event.target.value);
});
const attendanceNormalizeBeforeLeave=normalizeAttendanceStatus;
normalizeAttendanceStatus=function(value){const v=String(value||'').trim().toLowerCase();if(['pl','paid leave','paidleave'].includes(v))return 'Paid Leave';if(['weekly off','weeklyoff','wo'].includes(v))return 'Weekly Off';return attendanceNormalizeBeforeLeave(value)};
const attendanceLabelBeforeLeave=attendanceLabel;
attendanceLabel=function(status){const v=normalizeAttendanceStatus(status);return v==='Paid Leave'?'PL':v==='Weekly Off'?'WO':attendanceLabelBeforeLeave(v)};
const attendanceDailyBeforeLeave=dailyAttendanceMarkup;
dailyAttendanceMarkup=function(){return attendanceDailyBeforeLeave()};
const attendanceEstimateBeforeCriteria=attendanceSalaryEstimate;
function attendanceWeeklyOffFor(staff){return staff.weeklyOffDay&&staff.weeklyOffDay!=='Use Global'?staff.weeklyOffDay:(db.settings.attendanceGlobalWeeklyOff||'Sunday')}
function attendanceMonthlySummary(staff,days,read=(date,id)=>attendanceFor(date,id)){
  const allowance=Math.max(0,Math.floor(Number(staff.paidLeaveDaysPerMonth)||0));
  const offIndex=attendanceCriteriaDays.indexOf(attendanceWeeklyOffFor(staff));
  const result={attendanceRuleSummary:true,days:days.length,present:0,half:0,absent:0,paidLeave:0,excessLeave:0,weeklyOff:0,payable:0,statuses:{}};
  for(const day of [...days].sort((a,b)=>a.date.localeCompare(b.date))){
    let status=normalizeAttendanceStatus(read(day.date,staff.id)?.status);
    const scheduled=offIndex>=0&&new Date(day.date+'T12:00:00').getDay()===offIndex;
    if(scheduled&&(status==='Unmarked'||status==='Paid Leave'))status='Weekly Off';
    if(status==='Present'){result.present++;result.payable++}
    else if(status==='Half Day'){result.half++;result.payable+=.5}
    else if(status==='Absent')result.absent++;
    else if(status==='Weekly Off'){result.weeklyOff++;result.payable++}
    else if(status==='Paid Leave'){
      if(result.paidLeave<allowance){result.paidLeave++;result.payable++}
      else {result.excessLeave++;status='Unpaid Leave'}
    }
    result.statuses[day.date]=status;
  }
  return result;
}
function attendanceEligiblePaidLeaves(staff,days){return attendanceMonthlySummary(staff,days).paidLeave}
attendanceSalaryEstimate=function(staff,counts,days){
  const type=String(staff.salaryType||'').trim().toLowerCase(),amount=Number(staff.salary||0);
  if(type!=='monthly'&&type!=='daily')return attendanceEstimateBeforeCriteria(staff,counts,days);
  const summary=counts.attendanceRuleSummary?counts:attendanceMonthlySummary(staff,days);
  const dailyRate=type==='monthly'?(days.length?amount/days.length:0):amount;
  return {dailyRate,estimated:round(dailyRate*summary.payable),label:type==='monthly'?'Monthly salary ÷ calendar days × payable days (including weekly off and PL within allowance)':'Daily rate × payable days (including weekly off and PL within allowance)'};
};
const monthlyMarkupBeforeLeaveCriteria=monthlyAttendanceMarkup;
monthlyAttendanceMarkup=function(){let html=monthlyMarkupBeforeLeaveCriteria();return html.replace('while Paid Leave is fully paid','with weekly off paid and PL paid within the Staff Master monthly allowance; excess PL is unpaid').replace('<span class="absent">A <b>Absent (0.0)</b></span>','<span class="absent">A <b>Absent (0.0)</b></span><span class="paidleave">PL <b>Paid Leave</b></span><span class="weeklyoff">WO <b>Weekly Off</b></span>').replace('Tap a day cell to cycle its status. Changes save immediately.','Tap a day cell to cycle P, H, A, PL, WO or unmarked. PL is paid only within the staff member’s monthly allowance; Weekly Off is payable for salary.').replace('monthly salary is prorated over scheduled working days after excluding each staff member’s weekly off;','monthly salary is prorated over scheduled working days after excluding each staff member’s weekly off; eligible PL is paid within the allowance set in Staff Master; Weekly Off is payable;')};
render();
