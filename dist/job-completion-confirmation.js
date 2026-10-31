/* Confirm completion within Save Job Card when the remaining balance is zero. */
function jobCompletionBalance(draft,values){
  const remaining=jobPaymentRemaining(draft,values);
  if(remaining===null||remaining < -JOB_PAYMENT_ROUNDING_LIMIT)return null;
  return Math.abs(remaining)<=JOB_PAYMENT_ROUNDING_LIMIT?0:remaining;
}
function showJobCompletionApproval(form,onConfirm,rounding=0,reopenStatus=""){
  form.querySelector('.jobCompletionApproval')?.remove();
  const panel=document.createElement('section');panel.className='jobCompletionApproval';panel.setAttribute('role','alert');
  panel.style.cssText='width:100%;flex:0 0 100%;padding:12px;border:1px solid #93c5fd;background:#eff6ff;color:#172033;box-sizing:border-box;text-align:left;';
  panel.innerHTML='<strong>Confirm payment before completing this Job Card</strong><p style="margin:6px 0;font-size:12px">The remaining due is '+esc(money(0))+'. Confirm that the advance and payments entered have actually been received.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small" data-confirm-job-completion>Payment received — Save as Completed</button><button type="button" class="btn secondary small" data-review-job-payment>Review payment</button></div>';
  if(reopenStatus){
    panel.querySelector('strong').textContent='Reopen this Completed Job Card?';
    panel.querySelector('p').textContent='Change the status to '+reopenStatus+'? Existing advances, receipts and rounding adjustments will be retained.';
    panel.querySelector('[data-confirm-job-completion]').textContent='Confirm reopening';
    panel.querySelector('[data-review-job-payment]').textContent='Cancel';
  }
  if(rounding)panel.querySelector('p').append(' Payment rounding: '+(rounding>0?'+':"")+money(rounding)+'.');
  const footer=form.querySelector('.formactions');if(footer)footer.style.flexWrap='wrap';(footer||form).prepend(panel);
  panel.querySelector('[data-review-job-payment]').onclick=()=>{panel.remove();form.elements.duePaymentAmount?.focus();};
  let approved=false;
  panel.querySelector('[data-confirm-job-completion]').onclick=()=>{if(approved)return;approved=true;panel.remove();onConfirm();};
  panel.scrollIntoView({block:'nearest'});
}
const jobCompletionApprovals=new WeakMap();
function jobCompletionApprovalKey(draft,values){return JSON.stringify([values,draft.record.serviceLines,draft.record.partLines,billTotals({...draft.record,...values})]);}
const saveBeforeJobCompletionConfirmation=saveBill;
saveBill=function(event){
  const draft=jobDraft,form=event?.target,saveContext=this;
  if(draft?.key!=='jobs'||!form)return saveBeforeJobCompletionConfirmation.apply(this,arguments);
  event.preventDefault();
  const values=Object.fromEntries(new FormData(form)),status=values.status||draft.record.status;
  const hasLines=(draft.record.serviceLines||[]).length+(draft.record.partLines||[]).length>0;
  const balance=jobCompletionBalance(draft,values);
  const approval=jobCompletionApprovals.get(form);jobCompletionApprovals.delete(form);
  const saved=draft.id?find('jobs',draft.id):null;
  const earlierStage=!['Completed','Delivered','Cancelled'].includes(status);
  if(saved?.status==='Completed'&&earlierStage){
    if(approval===jobCompletionApprovalKey(draft,values))return saveBeforeJobCompletionConfirmation.apply(this,arguments);
    return showJobCompletionApproval(form,()=>{
      if(jobDraft!==draft)return;
      const latest=Object.fromEntries(new FormData(form));
      if(latest.status!==status)return toast('The selected Job Status has changed. Review it and save again.');
      if(typeof form.reportValidity==='function'&&!form.reportValidity())return;
      draft.record.completionManuallyReopened=true;
      jobCompletionApprovals.set(form,jobCompletionApprovalKey(draft,latest));
      try{form.requestSubmit();}finally{jobCompletionApprovals.delete(form);}
    },0,status);
  }
  if(earlierStage&&draft.record.completionManuallyReopened){
    form.querySelector('.jobCompletionApproval')?.remove();
    return saveBeforeJobCompletionConfirmation.apply(this,arguments);
  }
  if(balance===0&&status==='Completed'&&approval===jobCompletionApprovalKey(draft,values))return saveBeforeJobCompletionConfirmation.apply(this,arguments);
  if(status==='Completed'&&balance!==0){
    form.querySelector('.jobCompletionApproval')?.remove();
    return toast(balance===null?'Check the payment amounts before completing this Job Card.':'Record the remaining payment of '+money(balance)+' before saving this Job Card as Completed.');
  }
  if(hasLines&&status!=='Cancelled'&&status!=='Delivered'&&balance===0){
    return showJobCompletionApproval(form,()=>{
      if(jobDraft!==draft)return;
      const latest=Object.fromEntries(new FormData(form));
      if(jobCompletionBalance(draft,latest)!==0)return toast('The due amount has changed. Review the payment and save again.');
      if(latest.status==='Cancelled'||latest.status==='Delivered')return toast('The Job Status has changed. Review it and save again.');
      if(typeof form.reportValidity==='function'&&!form.reportValidity())return;
      const statusField=form.elements.status;
      if(!statusField)return toast('Select the Job Status before saving.');
      if(!Array.from(statusField.options).some(option=>option.value==='Completed')){
        const option=document.createElement('option');option.value='Completed';option.textContent='Completed';statusField.appendChild(option);
      }
      delete draft.record.completionManuallyReopened;
      const remaining=jobPaymentRemaining(draft,latest);
      draft.record.paymentRoundOff=round(Number(draft.record.paymentRoundOff||0)-remaining);
      statusField.value='Completed';statusField.dispatchEvent(new Event('change',{bubbles:true}));
      jobCompletionApprovals.set(form,jobCompletionApprovalKey(draft,Object.fromEntries(new FormData(form))));
      try{form.requestSubmit();}finally{jobCompletionApprovals.delete(form);}
    },round(-jobPaymentRemaining(draft,values)));
  }
  form.querySelector('.jobCompletionApproval')?.remove();
  return saveBeforeJobCompletionConfirmation.apply(this,arguments);
};