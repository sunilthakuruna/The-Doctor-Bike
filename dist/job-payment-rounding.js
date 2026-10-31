/* Settlement differences of up to INR 1 are retained as explicit bill adjustments. */
const JOB_PAYMENT_ROUNDING_LIMIT=1;
const totalsBeforeJobPaymentRounding=billTotals;
billTotals=function(b){const totals=totalsBeforeJobPaymentRounding(b);return {...totals,total:round(Number(totals.total)+Number(b.paymentRoundOff||0))};};
function jobPaymentRemaining(draft,values){
  const candidate={...draft.record,...values},advance=Number(candidate.advance||0),received=Number(values.duePaymentAmount||0);
  if(!Number.isFinite(advance)||advance<0||!Number.isFinite(received)||received<0)return null;
  const total=Number(billTotals(candidate).total);if(!Number.isFinite(total))return null;
  const saved=draft.id?find('jobs',draft.id):null;
  const before=saved?round(due(saved)+total-Number(billTotals(saved).total)+Number(saved.advance||0)-advance):round(total-advance);
  return round(before-received);
}
if(typeof thermalReceiptMarkup==='function'){
  const receiptBeforeJobPaymentRounding=thermalReceiptMarkup;
  thermalReceiptMarkup=function(key,id,width){const html=receiptBeforeJobPaymentRounding(key,id,width),bill=find(key,id),adjustment=Number(bill?.paymentRoundOff||0);return adjustment?html.replace('<div class="thermalBold"><dt>TOTAL</dt>','<div><dt>Payment rounding</dt><dd>'+adjustment.toFixed(2)+'</dd></div><div class="thermalBold"><dt>TOTAL</dt>'):html;};
}
