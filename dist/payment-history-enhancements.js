/* Payment audit history: visual collection indicators and reversible receipt deletion. */
(function(){
  const renderBeforePaymentHistory=render;
  const receiptIsRecorded=id=>(db.receipts||[]).some(receipt=>receipt.id===id);

  function historyVisuals(){
    const receipts=allReceipts().filter(matches);
    const collected=receipts.reduce((sum,receipt)=>sum+Number(receipt.amount||0),0);
    const bills=[...db.jobs,...db.sales].filter(bill=>bill.status!=='Cancelled');
    const totalBilled=bills.reduce((sum,bill)=>sum+Number(billTotals(bill).total||0),0);
    const outstanding=bills.reduce((sum,bill)=>sum+Number(due(bill)||0),0);
    const percent=totalBilled?Math.min(100,Math.round(collected/totalBilled*100)):0;
    return `<section class="paymentHistoryVisuals" aria-label="Payment history summary">
      <div class="paymentHistoryCard collected"><span>${icon('wallet')}</span><div><small>COLLECTED IN VIEW</small><strong>${money(collected)}</strong></div></div>
      <div class="paymentHistoryCard outstanding"><span>${icon('clock')}</span><div><small>CURRENT OUTSTANDING</small><strong>${money(outstanding)}</strong></div></div>
      <div class="paymentHistoryProgress"><div><span>Collection progress</span><strong>${percent}%</strong></div><div class="paymentProgressTrack"><i style="width:${percent}%"></i></div><small>${money(collected)} collected from ${money(totalBilled)} billed</small></div>
    </section>`;
  }

  function enhanceHistory(){
    if(page!=='payments'||tabState!=='history')return;
    const panel=$('#content .paymentEntryPage');
    const records=panel?.querySelector('.paymentRecords');
    if(!panel||!records||panel.querySelector('.paymentHistoryVisuals'))return;
    records.insertAdjacentHTML('afterbegin',historyVisuals());
    records.style.padding='8px';
    const visuals=records.querySelector('.paymentHistoryVisuals');
    Object.assign(visuals.style,{gap:'6px',marginBottom:'8px'});
    for(const card of visuals.children)Object.assign(card.style,{minHeight:'46px',padding:'6px 8px'});
  }

  render=function(){renderBeforePaymentHistory();enhanceHistory()};

})();
