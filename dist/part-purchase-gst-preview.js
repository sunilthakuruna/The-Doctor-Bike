/* Show latest dated purchase-entry price/GST without changing the master valuation reference. */
(function(){
  function latestPartPurchaseInfo(partId){
    const candidates=[];
    (db.purchases||[]).forEach((purchase,index)=>{
      if(purchase.status==='Cancelled'||!/^\d{4}-\d{2}-\d{2}$/.test(purchase.date||''))return;
      const lines=(purchase.partLines||[]).filter(line=>line.part===partId&&Number(line.qty)>0);
      if(!lines.length)return;
      const qty=lines.reduce((sum,line)=>sum+Number(line.qty||0),0);
      const cost=lines.reduce((sum,line)=>sum+Number(line.qty||0)*Number(line.price||0),0);
      const taxBase=lines.reduce((sum,line)=>sum+Number(line.qty||0)*Number(line.price||0),0);
      const gstAmount=lines.reduce((sum,line)=>sum+Number(line.qty||0)*Number(line.price||0)*Number(line.gst||0)/100,0);
      candidates.push({date:purchase.date,index,invoice:purchase.invoice||purchase.id,price:qty?cost/qty:0,gst:taxBase?gstAmount/taxBase*100:0});
    });
    candidates.sort((a,b)=>a.date.localeCompare(b.date)||a.index-b.index);
    return candidates.at(-1)||null;
  }
  function attachPurchasePriceAfterGst(){
    const form=document.getElementById('recordForm');
    if(!form)return;
    const purchase=form.querySelector('.formgrid [name="purchase"]'),gst=form.querySelector('.formgrid [name="gst"]');
    if(!purchase||!gst)return;
    const purchaseField=purchase.closest('.field'),gstField=gst.closest('.field');
    if(!purchaseField||!gstField)return;
    const grid=purchaseField.closest('.formgrid');
    if(!grid||gstField.parentElement!==grid)return;
    const existingPart=editing?.key==='parts'&&editing.id?find('parts',editing.id):null;
    const latest=existingPart?latestPartPurchaseInfo(existingPart.id):null;
    let resultField=form.querySelector('.purchaseAfterGstField');
    if(!resultField){
      resultField=document.createElement('label');
      resultField.className='field purchaseAfterGstField';
      resultField.innerHTML='<span>PURCHASE PRICE AFTER GST (₹)</span><input type="text" class="purchaseAfterGstValue" readonly aria-readonly="true" tabindex="-1"><small class="purchaseAfterGstNote">Reference calculation only. Actual supplier price and GST are recorded in Purchase Entry.</small>';
    }
    const dateField=form.querySelector('.formgrid [name="purchaseDate"]')?.closest('.field');
    const sellingField=form.querySelector('.formgrid [name="price"]')?.closest('.field');
    const ordered=[purchaseField,gstField,resultField,sellingField,dateField].filter(Boolean);
    let anchor=purchaseField.previousElementSibling?.classList.contains('formsection')?purchaseField.previousElementSibling:null;
    for(const field of ordered){grid.insertBefore(field,anchor?anchor.nextElementSibling:null);anchor=field}
    const output=resultField.querySelector('.purchaseAfterGstValue');
    if(latest){
      purchase.value=latest.price;gst.value=String(Number(latest.gst.toFixed(2)));
      purchase.readOnly=true;gst.disabled=true;
      if(!form.querySelector('[data-part-master-hidden="purchase"]')){const hidden=document.createElement('input');hidden.type='hidden';hidden.name='purchase';hidden.value=String(existingPart.purchase??0);hidden.dataset.partMasterHidden='purchase';form.appendChild(hidden)}
      if(!form.querySelector('[data-part-master-hidden="gst"]')){const hidden=document.createElement('input');hidden.type='hidden';hidden.name='gst';hidden.value=String(existingPart.gst??0);hidden.dataset.partMasterHidden='gst';form.appendChild(hidden)}
      purchaseField.querySelector('.purchaseReceiptSourceNote')?.remove();
      gstField.querySelector('.purchaseReceiptSourceNote')?.remove();
      const source='From latest Purchase Entry · '+latest.date+(latest.invoice?' · '+latest.invoice:'');
      for(const field of [purchaseField,gstField]){const note=document.createElement('small');note.className='purchaseReceiptSourceNote';note.textContent=source;field.appendChild(note)}
      const note=resultField.querySelector('.purchaseAfterGstNote');if(note)note.textContent='Calculated from the latest dated Purchase Entry above. It does not replace the protected master stock valuation reference.';
    }
    const update=()=>{
      const base=Number(purchase.value||0),rate=Number(gst.value||0);
      output.value=money(base+base*rate/100);
      output.title=money(base)+' purchase price + '+rate+'% GST';
    };
    purchase.addEventListener('input',update);
    gst.addEventListener('change',update);
    update();
  }
  const priorEditRecord=editRecord;
  editRecord=function(key){const result=priorEditRecord.apply(this,arguments);if(key==='parts')requestAnimationFrame(attachPurchasePriceAfterGst);return result};
})();
