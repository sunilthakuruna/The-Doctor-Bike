/* Reflect salary advance and salary payment expenses in Staff Master calculations. */
(function(){
  const salaryRecord=expense=>['Salary','Staff Salary / Advance'].includes(expense.category)&&expense.staff;
  function salaryTotals(staff){
    const records=(db.expenses||[]).filter(salaryRecord).filter(expense=>expense.staff===staff.id);
    const advance=records.filter(expense=>expense.salaryPaymentType==='advance').reduce((sum,expense)=>sum+Number(expense.amount||0),0);
    const salaryPaid=records.filter(expense=>expense.salaryPaymentType!=='advance').reduce((sum,expense)=>sum+Number(expense.amount||0),0);
    const total=advance+salaryPaid,monthly=staff.salaryType==='Monthly'?Number(staff.salary||0):0;
    return {advance,salaryPaid,total,due:staff.salaryType==='Monthly'?Math.max(0,monthly-total):null};
  }
  function applyStaffSalaryCalculation(){
    if(page!=='staff')return;
    const tableEl=$('#content table');
    if(!tableEl||tableEl.dataset.salaryExpenseCalculation)return;
    tableEl.dataset.salaryExpenseCalculation='true';
    const header=tableEl.querySelector('thead tr');
    if(!header)return;
    header.insertAdjacentHTML('beforeend','<th>SALARY ADVANCE</th><th>SALARY PAID</th><th>TOTAL PAID</th><th>SALARY DUE</th>');
    for(const row of tableEl.querySelectorAll('tbody tr')){
      const id=row.cells?.[0]?.textContent.trim(),staff=find('staff',id);
      if(!staff)continue;
      const totals=salaryTotals(staff),due=totals.due===null?'Per-job basis':money(totals.due);
      row.insertAdjacentHTML('beforeend',`<td>${money(totals.advance)}</td><td>${money(totals.salaryPaid)}</td><td><strong>${money(totals.total)}</strong></td><td><span class="staffSalaryDue ${totals.due===0?'settled':''}">${due}</span></td>`);
    }
    const all=db.staff||[],totalAdvance=all.reduce((sum,staff)=>sum+salaryTotals(staff).advance,0),totalPaid=all.reduce((sum,staff)=>sum+salaryTotals(staff).salaryPaid,0),totalDue=all.reduce((sum,staff)=>sum+Number(salaryTotals(staff).due||0),0);
    tableEl.closest('.tablewrap')?.insertAdjacentHTML('beforebegin',`<div class="staffSalaryExpenseStrip"><span><small>TOTAL SALARY ADVANCE</small><b>${money(totalAdvance)}</b></span><span><small>TOTAL SALARY PAID</small><b>${money(totalPaid)}</b></span><span><small>TOTAL MONTHLY SALARY DUE</small><b>${money(totalDue)}</b></span><em>Calculated from saved Salary Advance and Salary Payment expense entries.</em></div>`);
  }
  const renderBeforeStaffSalaryCalculation=render;
  render=function(){renderBeforeStaffSalaryCalculation();applyStaffSalaryCalculation()};
})();
