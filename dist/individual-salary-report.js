/* Individual salary statement: one staff member, one selected month, with calculation evidence. */
(function(){
  const salaryExpense=expense=>['Salary','Staff Salary / Advance'].includes(expense.category)&&expense.staff;
  const sameMonth=(date,month)=>String(date||'').startsWith(month);
  function attendanceSummary(staff,month){
    return attendanceMonthlySummary(staff,monthDays(month),(date,id)=>db.attendance?.[date]?.[id]);
  }
  function statementData(staff,month){
    const attendance=attendanceSummary(staff,month),type=String(staff.salaryType||'Monthly').toLowerCase().replace(/[\s_-]/g,'');
    const perJob=type==='perjob';
    const jobs=(db.jobs||[]).filter(job=>(typeof payrollJobMatchesStaff==='function'?payrollJobMatchesStaff(job,staff):job.mechanic===staff.id)&&sameMonth(job.date,month)&&['Completed','Delivered'].includes(job.status));
    let earned=0,rule='';
    if(perJob){earned=round(jobs.reduce((sum,job)=>sum+Number(billTotals(job).labour||0),0)*Number(staff.salary||0)/100);rule=`${staff.salary||0}% of completed/delivered job labour`}
    else {
      const [year,monthNo]=month.split('-').map(Number);
      const days=Array.from({length:attendance.days},(_,index)=>({date:`${year}-${String(monthNo).padStart(2,'0')}-${String(index+1).padStart(2,'0')}`}));
      const estimate=typeof attendanceSalaryEstimate==='function'?attendanceSalaryEstimate(staff,attendance,days):null;
      earned=round(Number(estimate?.estimated??(type==='daily'?Number(staff.salary||0)*attendance.payable:Number(staff.salary||0)/attendance.days*attendance.payable)));
      rule=estimate?.label||(type==='daily'?`${money(staff.salary||0)} daily × ${attendance.payable} payable days`:`${money(staff.salary||0)} monthly ÷ ${attendance.days} days × ${attendance.payable} payable days`);
    }
    const expenses=(db.expenses||[]).filter(salaryExpense).filter(expense=>expense.staff===staff.id&&sameMonth(expense.date,month));
    const advance=round(expenses.filter(expense=>expense.salaryPaymentType==='advance').reduce((sum,expense)=>sum+Number(expense.amount||0),0));
    const paidAmount=round(expenses.filter(expense=>expense.salaryPaymentType!=='advance').reduce((sum,expense)=>sum+Number(expense.amount||0),0));
    return {staff,month,attendance,perJob,jobs,expenses,rule,earned,advance,paidAmount,due:Math.max(0,round(earned-advance-paidAmount))};
  }
  function statementMarkup(staffId,month){
    const staff=find('staff',staffId);if(!staff)return '<p>Staff record not found.</p>';
    const data=statementData(staff,month),attendance=data.attendance;
    const rows=[['Calculated Salary',month,data.rule,money(data.earned)],...(!data.perJob?[['Attendance',month,`${attendance.present} present · ${attendance.half} half day · ${attendance.absent} absent · ${attendance.paidLeave} paid leave · ${attendance.weeklyOff} weekly off · ${attendance.excessLeave} excess PL (unpaid)`,`${attendance.payable} payable days`]]:data.jobs.map(job=>['Completed Job Card',displayDate(job.date),`${job.id} · Labour ${money(billTotals(job).labour)} × ${staff.salary}%`,money(round(Number(billTotals(job).labour||0)*Number(staff.salary||0)/100))])),...data.expenses.map(expense=>[expense.salaryPaymentType==='advance'?'Salary Advance':'Salary Payment',displayDate(expense.date),`${expense.id} · ${expense.mode||'—'} · ${name('accounts',expense.account)||'—'}`,`− ${money(expense.amount)}`])];
    return `<section class="individualSalaryStatement"><div class="salaryStatementHeader"><div><strong>${esc(staff.name)}</strong><small>${esc(staff.id)} · ${esc(staff.designation||'—')} · ${esc(staff.salaryType||'Monthly')} salary</small></div><label>Salary Month <input id="individualSalaryMonth" type="month" value="${esc(month)}"></label></div>${summary([['SALARY GENERATED',money(data.earned)],['SALARY ADVANCE',money(data.advance)],['SALARY PAID',money(data.paidAmount)],['BALANCE DUE',money(data.due)]])}<p class="notice">Calculation: <strong>${esc(data.rule)}</strong>. This statement includes only the selected month’s attendance, completed jobs, salary advances and salary payments.</p>${table(['Source','Date / Month','Calculation / Reference','Amount'],rows)}</section>`;
  }
  function openStatement(staffId,month=today().slice(0,7)){
    const staff=find('staff',staffId);if(!staff)return;
    openModal('Individual Salary Report',`<div class="formbody" id="individualSalaryReportBody">${statementMarkup(staffId,month)}</div><div class="formactions"><button type="button" class="btn secondary" id="exportIndividualSalary">${icon('download')}Export Statement</button>${btn('Close','cancel','secondary')}</div>`);
    const bind=()=>{
      const input=$('#individualSalaryMonth');if(input)input.onchange=()=>{const body=$('#individualSalaryReportBody');if(body){body.innerHTML=statementMarkup(staffId,input.value||today().slice(0,7));bind()}};
      $('#exportIndividualSalary')?.addEventListener('click',()=>{
        const selected=$('#individualSalaryMonth')?.value||month,data=statementData(staff,selected);
        const csv=[['Staff ID','Staff Name','Month','Salary Scheme','Salary Generated','Salary Advance','Salary Paid','Balance Due'],[staff.id,staff.name,selected,staff.salaryType||'',data.earned,data.advance,data.paidAmount,data.due]];
        download(csv.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n'),`BIKE-DOCTOR-${staff.name.replace(/[^a-z0-9]+/gi,'-')}-salary-${selected}.csv`,'text/csv;charset=utf-8');
      });
    };bind();
  }
  const renderBeforeIndividualSalaryReport=render;
  render=function(){
    renderBeforeIndividualSalaryReport();
    if(page!=='staff')return;
    for(const row of $$('#content tbody tr')){
      const id=row.cells?.[0]?.textContent.trim(),staff=find('staff',id),actions=row.querySelector('.rowactions');
      if(staff&&actions&&!actions.querySelector('[data-individual-salary-report]'))actions.insertAdjacentHTML('afterbegin',`<button type="button" class="btn small extraAction blue" data-individual-salary-report="${esc(staff.id)}" title="Individual Salary Report" aria-label="Individual Salary Report">${icon('wallet')}</button>`);
    }
  };
  document.addEventListener('click',event=>{const button=event.target.closest('[data-individual-salary-report]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();openStatement(button.dataset.individualSalaryReport)},true);
  render();
})();
