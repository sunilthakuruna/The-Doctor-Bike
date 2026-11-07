/* Advance payment at creation and later collections during Job Card editing. */
const billFormBeforeDueWorkflow=billForm;
billForm=function(key,id,initial){
  billFormBeforeDueWorkflow(key,id,initial);
  if(key!=='jobs')return;
  let form=$('#billForm'),record=id?find('jobs',id):jobDraft?.record;
  if(!form||!record)return;
  let advance=form.elements.advance;
  let payments=form.querySelector('.jobPaymentFields');
  if(advance&&payments){let oldRow=advance.parentElement,fieldWrap=document.createElement('label'),label=document.createElement('span');fieldWrap.className='field';label.textContent=id?'Initial Advance Amount (₹)':'Advance Amount (₹)';fieldWrap.append(label,advance);oldRow.replaceWith(fieldWrap);payments.append(fieldWrap);advance.readOnly=false;advance.disabled=false;advance.title='Enter or update the initial advance amount for this Job Card.'}
  if(payments){
    let sectionTitle=document.createElement('div');sectionTitle.className='formsection';sectionTitle.textContent='ADVANCE PAYMENT DETAILS';payments.before(sectionTitle);
    for(let [key,label] of [['mode',id?'Initial Payment Mode':'Advance Payment Mode'],['account',id?'Initial Deposit Account':'Deposit Account for Advance']]){let input=form.elements[key],span=input?.closest('label')?.querySelector('span');if(span)span.textContent=label}
    payments.insertAdjacentHTML('beforeend',field({key:'advanceDate',label:id?'Initial Payment Date':'Advance Payment Date',type:'date',default:record.date},{advanceDate:record.advanceDate||record.date||today()}));
    payments.insertAdjacentHTML('beforeend',field({key:'advanceRef',label:'Advance Reference'},{advanceRef:record.advanceRef||''}));
  }
  if(!id)return;
  const savedRecord=id?structuredClone(record):record,savedAdvance=Number(savedRecord?.advance||0),savedTotal=billTotals(savedRecord).total,savedPending=due(savedRecord);
  let pending=savedPending,section=document.createElement('section');section.className='jobDuePayment';
  section.innerHTML='<div class="formsection">PAYMENT AGAINST DUE</div><p>Current pending balance: <strong id="currentJobPendingDue">'+money(pending)+'</strong>. Leave the amount blank if you are not receiving a payment now.</p><div class="formgrid">'+field({key:'duePaymentAmount',label:'Amount Received Now (₹)',type:'number'},{duePaymentAmount:''})+field({key:'duePaymentDate',label:'Payment Date',type:'date',default:today()},{duePaymentDate:today()})+field({key:'duePaymentMode',label:'Payment Mode',type:'select',options:list('Payment Modes'),default:'Cash'},{duePaymentMode:'Cash'})+field({key:'duePaymentAccount',label:'Deposit Account',type:'select',options:()=>reference('accounts','name',true),default:db.accounts.find(a=>a.status!=='Inactive')?.id},{duePaymentAccount:db.accounts.find(a=>a.status!=='Inactive')?.id||''})+field({key:'duePaymentRef',label:'Reference / Transaction No.'},{})+field({key:'duePaymentRemarks',label:'Notes / Remarks'},{})+'</div>';
  let totals=form.querySelector('.jobBillingTotals');if(totals)totals.before(section);else form.querySelector('.jobBillingPanel')?.append(section);
  form.onsubmit=saveBill;
  const paymentInput=form.elements.duePaymentAmount;
  paymentInput?.insertAdjacentHTML('afterend','<small id="jobPaymentValidation" role="alert" style="color:#b91c1c" hidden></small>');
  const refreshPendingBalance=()=>{
    if(!jobDraft||jobDraft.key!=='jobs')return;
    const advanceValue=Number(form.elements.advance?.value||0);
    jobDraft.record.advance=advanceValue;
    updateBillTotals();
    const totalChange=billTotals(jobDraft.record).total-savedTotal;
    const pendingBeforePayment=Math.max(0,round(savedPending+totalChange+savedAdvance-advanceValue));
    const receivedValue=Number(form.elements.duePaymentAmount?.value||0);
    const receivedNow=Number.isFinite(receivedValue)?Math.max(0,receivedValue):0;
    const remaining=round(pendingBeforePayment-receivedNow);
    const roundedSettlement=Math.abs(remaining)<=JOB_PAYMENT_ROUNDING_LIMIT;
    const current=roundedSettlement?0:Math.max(0,remaining);
    const excess=round(receivedNow-pendingBeforePayment);
    const warning=form.querySelector('#jobPaymentValidation');
    const paymentError=excess>JOB_PAYMENT_ROUNDING_LIMIT?'Payment exceeds the due by '+money(excess)+'. Enter '+money(pendingBeforePayment)+' to settle this Job Card.':"";
    paymentInput?.setCustomValidity(paymentError);
    if(warning){const roundingHint=roundedSettlement&&remaining?'Rounding adjustment on confirmation: '+money(-remaining)+' (within ₹1).':"";warning.hidden=!(paymentError||roundingHint);warning.textContent=paymentError||roundingHint;warning.style.color=paymentError?'#b91c1c':'#475569';}
    const display=form.querySelector('#currentJobPendingDue');
    const summaryDue=$('#sumDue');
    if(display)display.textContent=money(current);
    if(summaryDue)summaryDue.textContent=money(current);
  };  form.addEventListener('input',refreshPendingBalance);
  form.addEventListener('change',refreshPendingBalance);
  advance?.addEventListener('input',refreshPendingBalance);
  advance?.addEventListener('change',refreshPendingBalance);
  refreshPendingBalance();
};
const saveBillBeforeDueWorkflow=saveBill;
saveBill=function(event){
  let draft=jobDraft,form=event?.target;
  if(draft?.key!=='jobs'||!draft.id||!form)return saveBillBeforeDueWorkflow(event);
  let amountInput=form.elements.duePaymentAmount,amount=Number(amountInput?.value||0),paymentFields=Array.from(form.querySelectorAll('[name^="duePayment"]'));
  if(!Number.isFinite(amount)||amount<0){event.preventDefault();return toast('Enter a valid payment amount.')}
  if(amount===0){paymentFields.forEach(x=>x.disabled=true);try{return saveBillBeforeDueWorkflow(event)}finally{paymentFields.forEach(x=>x.disabled=false)}}
  let values=Object.fromEntries(new FormData(form)),candidate={...draft.record,...values},pending=Math.max(0,round(billTotals(candidate).total-paid(candidate)));
  if(amount>pending){event.preventDefault();return toast('Payment cannot exceed the pending balance of '+money(pending)+'.')}
  if(candidate.status==='Cancelled'){event.preventDefault();return toast('Record payment before changing this Job Card to Cancelled.')}
  let date=values.duePaymentDate||today(),mode=values.duePaymentMode||'Cash',account=values.duePaymentAccount||db.accounts.find(a=>a.status!=='Inactive')?.id;
  if(!date||!mode||!account){event.preventDefault();return toast('Enter the payment date, mode, and deposit account.')}
  let receipt={id:nextId('receipts'),bill:draft.id,due:pending,amount,date,mode,account,ref:values.duePaymentRef||'',remarks:values.duePaymentRemarks||'',party:name('customers',candidate.customer)||candidate.customerName||''};
  db.receipts.push(receipt);paymentFields.forEach(x=>x.disabled=true);
  try{saveBillBeforeDueWorkflow(event);if(!$('#modal').hidden)db.receipts=db.receipts.filter(r=>r.id!==receipt.id)}catch(error){db.receipts=db.receipts.filter(r=>r.id!==receipt.id);throw error}finally{paymentFields.forEach(x=>x.disabled=false)}
};
const invoiceBeforeDueWorkflow=invoice;
invoice=function(key,id,paper){
  invoiceBeforeDueWorkflow(key,id,paper);let bill=find(key,id),sheet=$('#modalBody .invoice');if(!bill||!sheet)return;
  sheet.querySelector('.invoiceReceiptBreakdown')?.remove();let receipts=db.receipts.filter(r=>r.bill===id),box=document.createElement('section');box.className='invoiceReceiptBreakdown';
  box.innerHTML='<strong>Payment Summary</strong>'+(Number(bill.paymentRoundOff||0)?'<div><span>Payment rounding</span><b>'+money(bill.paymentRoundOff)+'</b></div>':"")+'<div><span>Advance payment</span><b>'+money(bill.advance||0)+'</b></div><div><span>Payments received against due</span><b>'+money(receipts.reduce((sum,r)=>sum+Number(r.amount||0),0))+'</b></div>'+(bill.advanceDate?'<small>Advance date: '+esc(bill.advanceDate)+(bill.mode?' · '+esc(bill.mode):'')+(bill.advanceRef?' · Ref: '+esc(bill.advanceRef):'')+'</small>':'')+(receipts.length?'<small>'+receipts.map(r=>esc(r.date)+' · '+esc(r.mode||'Payment')+' · '+money(r.amount)).join('<br>')+'</small>':'');
  let dueRow=Array.from(sheet.querySelectorAll('.invoicetotal p')).find(p=>/Outstanding Due|Balance Due|Due Amount/i.test(p.textContent));(dueRow||sheet.querySelector('.invoicetotal'))?.after(box)
};
const dueWorkflowStyle=document.createElement('style');dueWorkflowStyle.textContent='.jobDuePayment{margin:14px 0;padding:12px;background:#eff6ff;border:1px solid #bfdbfe}.jobDuePayment>p{font-size:12px;color:#475569;margin:6px 0 12px}.jobDuePayment .formgrid{gap:10px 14px}.invoiceReceiptBreakdown{border-top:1px solid #cbd5e1;margin-top:12px;padding-top:10px;font-size:11px;color:#475569}.invoiceReceiptBreakdown>strong{display:block;margin-bottom:6px;color:#172033}.invoiceReceiptBreakdown>div{display:flex;justify-content:space-between;gap:12px;padding:3px 0}.invoiceReceiptBreakdown small{display:block;margin-top:5px;line-height:1.6;color:#64748b}';document.head.appendChild(dueWorkflowStyle);

