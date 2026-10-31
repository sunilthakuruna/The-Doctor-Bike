/* Supplier payable visual summary, aligned with the payment audit view. */
(function(){
  const renderBeforeSupplierPayableVisuals=render;
  function supplierVisuals(){
    const purchases=(db.purchases||[]).filter(matches);
    const invoiceTotal=purchases.reduce((sum,purchase)=>sum+Number(billTotals(purchase).total||0),0);
    const paidTotal=purchases.reduce((sum,purchase)=>sum+Number(paid(purchase)||0),0);
    const payableTotal=purchases.reduce((sum,purchase)=>sum+Number(due(purchase)||0),0);
    const percent=invoiceTotal?Math.min(100,Math.round(paidTotal/invoiceTotal*100)):0;
    return `<section class="supplierPayableVisuals" aria-label="Supplier payable summary">
      <div class="supplierPayableCard payable"><span>${icon('clock')}</span><div><small>PAYABLE IN VIEW</small><strong>${money(payableTotal)}</strong></div></div>
      <div class="supplierPayableCard paid"><span>${icon('wallet')}</span><div><small>PAID AGAINST PURCHASES</small><strong>${money(paidTotal)}</strong></div></div>
      <div class="supplierPayableProgress"><div><span>Supplier payment progress</span><strong>${percent}%</strong></div><div class="supplierProgressTrack"><i style="width:${percent}%"></i></div><small>${money(paidTotal)} paid from ${money(invoiceTotal)} purchase value</small></div>
    </section>`;
  }
  function enhanceSupplierPayable(){
    if(page!=='payments'||tabState!=='suppliers')return;
    const panel=$('#content .paymentEntryPage'),records=panel?.querySelector('.paymentRecords');
    if(!panel||!records||panel.querySelector('.supplierPayableVisuals'))return;
    records.insertAdjacentHTML('afterbegin',supplierVisuals());
    records.style.padding='8px';
    const visuals=records.querySelector('.supplierPayableVisuals');
    if(visuals&&!records.querySelector('.supplierPayableHint')){const hint=document.createElement('p');hint.className='supplierPayableHint';hint.innerHTML='<strong>Calculation:</strong> Supplier Payable Due = Purchase Invoice Total − Paid Amount. Purchase Invoice Total includes item quantity × purchase rate, applicable GST and discounts. The result is the amount your business still owes the vendor.';visuals.after(hint)}
    Object.assign(visuals.style,{gap:'6px',marginBottom:'8px'});
    for(const card of visuals.children)Object.assign(card.style,{minHeight:'46px',padding:'6px 8px'});
  }
  render=function(){renderBeforeSupplierPayableVisuals();enhanceSupplierPayable()};
})();
