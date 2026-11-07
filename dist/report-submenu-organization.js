/* Keep specialist reports inside the Reports submenu rather than as separate main navigation items. */
(function(){
  const financeGroup=groups.find(group=>group[0]==='FINANCE & REPORTS');
  if(financeGroup)financeGroup[1]=financeGroup[1].filter(item=>!['report-stock-movements','report-salary-calculation'].includes(item[0]));
  nav();
})();
/* Add compact fallback hints only where an operational page has no existing hint. */
(function(){
  const hints={
    customers:'Hint: Customer details are reused in vehicles, job cards, invoices and collection records.',
    bikes:'Hint: Vehicle records link a customer to service history, job cards, AMC and service reminders.',
    staff:'Hint: Salary scheme and staff details feed attendance, per-job salary and salary reports.',
    attendance:'Hint: Attendance is saved by date and feeds monthly salary calculations according to the staff salary scheme.',
    payroll:'Hint: Per-job earnings use completed or delivered jobs and the staff member’s saved percentage rule.',
    services:'Hint: Service master rates are defaults; job-card line charges and GST can be adjusted for that job only.',
    jobs:'Hint: Job totals include services, spare parts and miscellaneous items. Line discounts and saved GST rates apply to services/parts; miscellaneous items have no GST. Saved part quantities reduce Main Stock.',
    parts:'Hint: Main Stock is calculated from opening stock, purchases into Main Stock, transfers in and saved sales/used quantities.',
    godown:'Hint: Godown receipts stay in Godown until transfer; a transfer reduces Godown and increases Main Stock by the selected lot quantity.',
    sales:'Hint: Counter sales use Main Stock, apply line discounts and GST per line, and record payment and due amounts.',
    purchases:'Hint: Each purchase line keeps its own vendor, quantity, rate and GST; the selected destination controls Main Stock or Godown.',
    payments:'Hint: Customer receipts reduce bill due amounts; supplier payments reduce purchase dues. Each payment keeps its date, mode and account.',
    accounts:'Hint: Current balance is based on opening balance plus recorded receipts and payments linked to the account.',
    appointments:'Hint: Appointment dates and status are scheduling details; converting an appointment creates the related job-card workflow.',
    insurance:'Hint: Policy status is based on issue and expiry dates; expiring and expired policies are highlighted automatically.',
    'service-reminders':'Hint: Service reminder status uses each vehicle’s saved due date; updating the due date starts a new reminder cycle.',
    'amc-plans':'Hint: AMC status and expiry reminders use the linked vehicle contract dates and selected shared AMC plan.',
    lists:'Hint: List values are shared options used by the related forms; changing a value affects future selections.',
    users:'Hint: Module access controls page visibility; action rights control add, edit, delete, export and other operations.',
    audit:'Hint: Audit entries record saved create, update, payment and permission actions with date, user and module details.'
  };
  const addFallbackHint=()=>{
    const key=typeof page==='string'?page:''; const text=hints[key]; if(!text)return;
    const content=document.querySelector('#content'); if(!content||content.querySelector('.moduleCalculationHint,.reportCalculationHint,.partsStockGuide,.profitOperatingNote'))return;
    const hint=document.createElement('p'); hint.className='moduleCalculationHint'; hint.textContent=text; content.appendChild(hint);
  };
  const style=document.createElement('style'); style.textContent='.moduleCalculationHint{margin:12px 0 0;padding:7px 10px;color:#64748b;font-size:10px;line-height:1.35;border-top:1px solid #e2e8f0}'; document.head.appendChild(style);
  new MutationObserver(addFallbackHint).observe(document.body,{childList:true,subtree:true}); addFallbackHint();
})();
/* Explain Garage Expenses Management totals. */
(function(){
  const addExpensesHint=()=>{
    if(typeof page==='undefined'||page!=='expenses')return;
    const content=document.querySelector('#content'); if(!content||content.querySelector('[data-expenses-hint]'))return;
    const hint=document.createElement('p'); hint.dataset.expensesHint='true'; hint.className='reportCalculationHint';
    hint.textContent='Calculation hint: Total Expenses sums all saved expense entries. This Month and Today use the expense date. Salary advances and salary payments remain expense entries and are included in staff salary calculations when linked to a staff member.';
    content.appendChild(hint);
  };
  new MutationObserver(addExpensesHint).observe(document.body,{childList:true,subtree:true}); addExpensesHint();
})();
/* Explain vendor-wise spare-part purchase report totals. */
(function(){
  const addVendorPurchaseHint=()=>{
    if(typeof page==='undefined'||page!=='report-vendor-purchases')return;
    const content=document.querySelector('#content'); if(!content||content.querySelector('[data-vendor-purchase-hint]'))return;
    const hint=document.createElement('p'); hint.dataset.vendorPurchaseHint='true'; hint.className='reportCalculationHint';
    hint.textContent='Calculation hint: Purchases are grouped by vendor and purchase entry. Item values use the saved purchase rate and quantity after line discounts; GST is shown separately. Invoice total, paid and due amounts cover the full matching invoice, including its other items and invoice-level adjustments.';
    content.appendChild(hint);
  };
  new MutationObserver(addVendorPurchaseHint).observe(document.body,{childList:true,subtree:true}); addVendorPurchaseHint();
})();
/* Explain customer collection report totals and receipt treatment. */
(function(){
  const addCollectionHint=()=>{
    if(typeof page==='undefined'||page!=='report-collection')return;
    const content=document.querySelector('#content'); if(!content||content.querySelector('[data-collection-hint]'))return;
    const hint=document.createElement('p'); hint.dataset.collectionHint='true'; hint.className='reportCalculationHint';
    hint.textContent='Calculation hint: Customer collections include saved payment receipts for the selected period. Advances and later receipts are counted once, using the receipt amount, payment date, mode and account. This report does not recalculate the invoice total or GST.';
    content.appendChild(hint);
  };
  new MutationObserver(addCollectionHint).observe(document.body,{childList:true,subtree:true}); addCollectionHint();
})();
/* Explain the Unique Parts count on the part-wise purchase report. */
(function(){
  const style=document.createElement('style'); style.textContent='.reportCalculationHint{margin:12px 0 0;padding:7px 10px;color:#64748b;font-size:10px;line-height:1.35;border-top:1px solid #e2e8f0}'; document.head.appendChild(style);
  const addPurchaseReportHint=()=>{
    if(typeof page==='undefined'||page!=='report-purchases')return;
    const content=document.querySelector('#content'); if(!content)return;
    content.querySelectorAll('.summaryitem').forEach(item=>{if(/UNIQUE PARTS/i.test(item.textContent||''))item.remove()});
  };
  new MutationObserver(addPurchaseReportHint).observe(document.body,{childList:true,subtree:true}); addPurchaseReportHint();
})();
