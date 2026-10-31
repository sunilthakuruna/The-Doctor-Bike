/* Staff-wise salary calculation report with attendance, jobs and payment sources. */
(function(){
  let salaryReportStaff='',salaryReportMonth=today().slice(0,7);
  const reportKey='report-salary-calculation';
  if(!reports.some(item=>item[0]===reportKey))reports.push([reportKey,'Staff Salary Calculation']);
  titles[reportKey]='Staff Salary Calculation Report';
  const financeGroup=groups.find(group=>group[0]==='FINANCE & REPORTS');
  if(financeGroup&&!financeGroup[1].some(item=>item[0]===reportKey)){
    const reportIndex=financeGroup[1].findIndex(item=>item[0]==='reports');
    financeGroup[1].splice(reportIndex<0?financeGroup[1].length:reportIndex+1,0,[reportKey,'Staff Salary Report','wallet']);
  }
  const isSalaryExpense=expense=>['Salary','Staff Salary / Advance'].includes(expense.category)&&expense.staff;
  const sameMonth=(date,month)=>String(date||'').startsWith(month);
  function attendanceForMonth(staff,month){
    const [year,monthNo]=month.split('-').map(Number),days=new Date(year,monthNo,0).getDate();
    let present=0,half=0,absent=0,paidLeave=0,weeklyOff=0;
    for(let day=1;day<=days;day++){
      const date=`${year}-${String(monthNo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const status=db.attendance?.[date]?.[staff.id]?.status||'Unmarked';
      if(status==='Present')present++;else if(status==='Half Day')half++;else if(status==='Absent')absent++;else if(status==='Paid Leave')paidLeave++;else if(status==='Weekly Off')weeklyOff++;
    }
    return {days,present,half,absent,paidLeave,weeklyOff,payable:present+half*.5+paidLeave+weeklyOff};
  }
  function salaryData(staff){
    const attendance=attendanceForMonth(staff,salaryReportMonth);
    const isPerJob=String(staff.salaryType||'').toLowerCase().replace(/[-_]/g,' ')==='per job';
    const jobs=(db.jobs||[]).filter(job=>payrollJobMatchesStaff?payrollJobMatchesStaff(job,staff):job.mechanic===staff.id).filter(job=>sameMonth(job.date,salaryReportMonth)&&['Completed','Delivered'].includes(job.status));
    const jobEarning=isPerJob?round(jobs.reduce((sum,job)=>sum+Number(billTotals(job).labour||0),0)*Number(staff.salary||0)/100):0;
    const attendanceEarning=!isPerJob?round(Number(staff.salary||0)/attendance.days*attendance.payable):0;
    const expenses=(db.expenses||[]).filter(isSalaryExpense).filter(expense=>expense.staff===staff.id&&sameMonth(expense.date,salaryReportMonth));
    const advance=expenses.filter(expense=>expense.salaryPaymentType==='advance').reduce((sum,expense)=>sum+Number(expense.amount||0),0);
    const paid=expenses.filter(expense=>expense.salaryPaymentType!=='advance').reduce((sum,expense)=>sum+Number(expense.amount||0),0);
    const earned=isPerJob?jobEarning:attendanceEarning;
    return {staff,attendance,isPerJob,jobs,jobEarning,attendanceEarning,expenses,advance,paid,earned,due:Math.max(0,earned-advance-paid)};
  }
  const reportPageBeforeSalaryCalculation=reportPage;
  reportPage=function(){
    if(page!==reportKey)return reportPageBeforeSalaryCalculation();
    const people=(db.staff||[]).filter(staff=>!salaryReportStaff||staff.id===salaryReportStaff).filter(matches),data=people.map(salaryData);
    const ledger=data.flatMap(info=>{
      const rows=[];
      rows.push([esc(info.staff.name),esc(salaryReportMonth),info.isPerJob?'Per-job salary rule':'Monthly salary + attendance rule',info.isPerJob?`${esc(info.staff.salary)}% of completed/delivered job labour`:`${money(info.staff.salary)} ÷ ${info.attendance.days} days × ${info.attendance.payable} payable days`,money(info.earned),'Calculated earning']);
      if(!info.isPerJob)rows.push([esc(info.staff.name),esc(salaryReportMonth),'Attendance detail',`${info.attendance.present} present · ${info.attendance.half} half day · ${info.attendance.absent} absent · ${info.attendance.paidLeave} paid leave · ${info.attendance.weeklyOff} weekly off`,money(info.attendanceEarning),'Attendance source']);
      for(const job of info.jobs)rows.push([esc(info.staff.name),esc(job.date),'Completed Job Card',`${esc(job.id)} · Labour ${money(billTotals(job).labour)} × ${info.staff.salary}%`,money(round(Number(billTotals(job).labour||0)*Number(info.staff.salary||0)/100)),'Job Card source']);
      for(const expense of info.expenses)rows.push([esc(info.staff.name),esc(expense.date),expense.salaryPaymentType==='advance'?'Salary Advance':'Salary Payment',`${esc(expense.id)} · ${esc(expense.mode||'—')} · ${esc(name('accounts',expense.account)||'—')}`,expense.salaryPaymentType==='advance'?`− ${money(expense.amount)}`:`− ${money(expense.amount)}`,'Expense source']);
      return rows;
    });
    const totalEarned=data.reduce((sum,info)=>sum+info.earned,0),totalAdvance=data.reduce((sum,info)=>sum+info.advance,0),totalPaid=data.reduce((sum,info)=>sum+info.paid,0),totalDue=data.reduce((sum,info)=>sum+info.due,0);
    return `<div class="intro"><h2>Staff Salary Calculation Report</h2><p>Mechanic-wise explanation of salary calculation from attendance, completed job cards, salary advances and salary payment expenses.</p></div>`+
      summary([['SALARY GENERATED',money(totalEarned)],['SALARY ADVANCES',money(totalAdvance)],['SALARY PAID',money(totalPaid)],['BALANCE DUE',money(totalDue)]])+
      `<div class="salaryReportFilters"><label>Salary Month<input id="salaryReportMonth" type="month" value="${esc(salaryReportMonth)}"></label><select id="salaryReportStaff" aria-label="Filter staff member"><option value="">All Staff Members</option>${opts(reference('staff'),salaryReportStaff)}</select><input id="search" class="search" type="search" placeholder="Search mechanic or source..." aria-label="Search salary report" value="${esc(search)}"><span class="spacer"></span><button type="button" class="btn exportButton" data-action="export">${icon('download')}Export Excel</button></div>`+
      `<section class="salaryReportSection"><h3>Mechanic Salary Summary</h3>${table(['Mechanic / Staff','Salary Scheme','Attendance / Jobs','Salary Generated','Salary Advance','Salary Paid','Balance Due'],data.map(info=>[`<strong>${esc(info.staff.name)}</strong><small>${esc(info.staff.id)} · ${esc(info.staff.designation||'—')}</small>`,info.isPerJob?`${esc(info.staff.salary)}% per job`:`${money(info.staff.salary)} monthly`,info.isPerJob?`${info.jobs.length} completed / delivered jobs`:`${info.attendance.payable} payable days`,money(info.earned),money(info.advance),money(info.paid),`<strong class="salaryReportDue">${money(info.due)}</strong>`]))}</section>`+
      `<section class="salaryReportSection"><h3>Salary Calculation Ledger</h3>${table(['Mechanic','Date / Month','Calculation Source','How It Was Calculated','Amount','Record Type'],ledger)}</section>`;
  };
  const renderBeforeSalaryReport=render;
  render=function(){renderBeforeSalaryReport();if(page!==reportKey)return;const staff=$('#salaryReportStaff'),month=$('#salaryReportMonth');if(staff)staff.onchange=event=>{salaryReportStaff=event.target.value;render()};if(month)month.onchange=event=>{salaryReportMonth=event.target.value||today().slice(0,7);render()}};
  nav();
})();
