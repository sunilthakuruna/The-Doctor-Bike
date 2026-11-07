const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function setup(records={}){
 const context=vm.createContext({schemas:{staff:[]},db:{settings:{attendanceWeeklyOffMode:'all',attendanceGlobalWeeklyOff:'Sunday'}},normalizeAttendanceStatus:v=>v||'Unmarked',attendanceLabel:v=>v,dailyAttendanceMarkup:()=>'',attendanceSalaryEstimate:()=>({estimated:777}),monthlyAttendanceMarkup:()=>'',render(){},round:n=>Math.round(n*100)/100,attendanceFor:(date)=>({status:records[date]})});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/attendance-criteria.js'),'utf8'),context);
 return context;
}
const days=Array.from({length:30},(_,i)=>({date:'2026-11-'+String(i+1).padStart(2,'0')}));
test('personal weekly off overrides global and is included in payable days',()=>{
 const c=setup(),s={id:'s',weeklyOffDay:'Monday',paidLeaveDaysPerMonth:2,salaryType:'Monthly',salary:30000};
 const summary=c.attendanceMonthlySummary(s,days);
 assert.equal(summary.weeklyOff,5);
 assert.equal(c.attendanceSalaryEstimate(s,summary,days).estimated,5000);
});
test('PL allowance is chronological, excess unpaid, weekly off does not consume PL',()=>{
 const c=setup({'2026-11-01':'Paid Leave','2026-11-02':'Paid Leave','2026-11-03':'Paid Leave','2026-11-04':'Paid Leave','2026-11-05':'Half Day','2026-11-06':'Present'});
 const s={id:'s',weeklyOffDay:'Sunday',paidLeaveDaysPerMonth:2,salaryType:'Monthly',salary:30000};
 const summary=c.attendanceMonthlySummary(s,days);
 assert.equal(summary.weeklyOff,5);assert.equal(summary.paidLeave,2);assert.equal(summary.excessLeave,1);
 assert.equal(summary.statuses['2026-11-04'],'Unpaid Leave');assert.equal(summary.payable,8.5);
 assert.equal(c.attendanceSalaryEstimate(s,summary,days).estimated,8500);
 s.salaryType='Daily';s.salary=100;
 assert.equal(c.attendanceSalaryEstimate(s,summary,days).estimated,850);
});
test('full marked month pays full salary and None disables scheduled off',()=>{
 const c=setup(Object.fromEntries(days.map(d=>[d.date,'Present'])));
 const s={id:'s',weeklyOffDay:'Sunday',salaryType:'Monthly',salary:30000};
 assert.equal(c.attendanceSalaryEstimate(s,{},days).estimated,30000);
 const empty=setup();s.weeklyOffDay='None';
 assert.equal(empty.attendanceMonthlySummary(s,days).weeklyOff,0);
 assert.equal(empty.attendanceEligiblePaidLeaves(s,days),0);
 assert.equal(empty.attendanceSalaryEstimate({...s,salaryType:'Per Job'},{},days).estimated,777);
});
test('staff API persists weekly off and allowance and rejects fractional allowances',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../functions/api/staff.js'),'utf8');
 const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const db={prepare(sql){return {bind(){return this}}},async batch(){return [{meta:{changes:1}}]}};
 const body={id:'BD-STF-1001',name:'Test',mobile:'9999999999',designation:'Mechanic',salaryType:'Monthly',salary:30000,weeklyOffDay:'Monday',paidLeaveDaysPerMonth:2};
 async function save(value){return onRequest({env:{DB:db},request:new Request('https://example.test/api/staff',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)})})}
 const response=await save(body);assert.equal(response.status,201);
 const result=(await response.json()).data;assert.equal(result.weeklyOffDay,'Monday');assert.equal(result.paidLeaveDaysPerMonth,2);
 assert.equal((await save({...body,paidLeaveDaysPerMonth:1.5})).status,400);
 assert.equal((await save({...body,salary:15000.5})).status,400);
 assert.equal((await save({...body,salaryType:'Per Job',salary:50.5})).status,400);
 assert.equal((await save({...body,salaryType:'Per Job',salary:101})).status,400);
 assert.equal((await save({...body,salaryType:'Per Job',salary:50})).status,201);
 assert.equal((await save({...body,weeklyOffDay:'Invalid'})).status,400);
});
