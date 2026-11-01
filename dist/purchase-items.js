/* Purchase item entry: linked code/name lookups and transaction snapshots. */
function newPurchaseItem(){return {part:'',partCode:'',name:'',hsn:'',qty:1,price:0,gst:0,vendor:'',brand:''}}
function purchaseSelectedPart(line,part){
  const next={...line,part:part?.id||'',partCode:part?.id||'',name:part?.name||'',hsn:String(part?.hsn||''),price:Number(part?.purchase||0),gst:Number(part?.gst??0)};
  delete next.sourceAmount;return next;
}
function purchaseLookupPart(value,kind,selectedId){
  const text=String(value||'').trim().toLocaleLowerCase();if(!text)return null;
  const parts=db.parts||[];
  if(kind==='code')return parts.find(p=>String(p.id).toLocaleLowerCase()===text)||null;
  const exact=parts.filter(p=>String(p.name||'').toLocaleLowerCase()===text);
  if(exact.length)return exact.find(p=>p.id===selectedId)||(exact.length===1?exact[0]:null);
  return parts.find(p=>(p.name+' — '+p.id).toLocaleLowerCase()===text)||null;
}
function purchasePartNameValue(part){return String(part.name||'')}
function purchaseMasterPriceInfo(part){
  if(!part)return 'Select a saved part to view master prices and GST.';
  return 'Master buy ref. '+money(part.purchase||0)+' · GST '+Number(part.gst||0)+'%';
}
function purchaseVendorOptions(record){
  const values=[...(db.lists?.Vendors||[]),...(db.purchases||[]).map(p=>p.supplier),...(db.parts||[]).map(p=>p.preferredVendor),record?.supplier]
    .map(v=>String(v||'').trim()).filter(Boolean);
  return [...new Map(values.map(v=>[v.toLocaleLowerCase(),v])).values()].sort((a,b)=>a.localeCompare(b));
}
function purchaseLineTotal(record,line){
  return Number(billTotals({serviceLines:[],partLines:[line],invoiceType:record.invoiceType,tax:0,discount:0}).total);
}
function purchaseLineGst(record,line){
  if(record.invoiceType==='non-gst')return 0;
  return round(Number(line.qty||0)*Number(line.price||0)*Number(line.gst||0)/100);
}
function purchaseStockQuantities(record,line,editId){
  const part=find('parts',line.part),location=record.stockLocation==='godown'?'godown':'main';
  const existing=part?(typeof locationStock==='function'?locationStock(part.id,location):(location==='main'?stock(part.id):0)):0;
  const saved=editId?find('purchases',editId):null;
  const oldQuantity=saved&&saved.status!=='Cancelled'&&(saved.stockLocation||'main')===location?(saved.partLines||[]).filter(item=>item.part===line.part).reduce((sum,item)=>sum+Number(item.qty||0),0):0;
  const nextQuantity=record.status==='Cancelled'?0:(record.partLines||[]).filter(item=>item.part===line.part).reduce((sum,item)=>sum+Number(item.qty),0);
  return {existing,total:round(existing-oldQuantity+nextQuantity),unit:part?.unit||'PCS',location};
}
function purchaseStockText(value,unit){return Number.isFinite(value)?Number(value).toLocaleString('en-IN',{maximumFractionDigits:2})+' '+unit:'—'}
function purchaseItemValidation(record){
  if(!record.partLines?.length)return 'Add at least one purchase item.';
  for(const [index,line] of record.partLines.entries()){
    const label='Item '+(index+1)+': ';
    if(!find('parts',line.part))return label+'choose a saved part by code or name.';
    if(!Number.isFinite(Number(line.qty))||Number(line.qty)<=0)return label+'enter a quantity greater than zero.';
    if(!Number.isFinite(Number(line.price))||Number(line.price)<0)return label+'enter a valid purchase price.';
    if(!Number.isFinite(Number(line.gst))||Number(line.gst)<0||Number(line.gst)>100)return label+'enter a GST rate from 0 to 100.';
  }
  return '';
}
function refreshPurchaseItemTotals(){
  if(jobDraft?.key!=='purchases')return;
  const record=jobDraft.record;
  for(const [i,line] of record.partLines.entries()){
    const amount=document.getElementById('lineAmount'+i);if(amount)amount.textContent=money(purchaseLineTotal(record,line));
    const gstAmount=document.querySelector('[data-purchase-gst-amount="'+i+'"]');if(gstAmount)gstAmount.textContent=money(purchaseLineGst(record,line));
    const masterInfo=document.querySelector('[data-purchase-master-info="'+i+'"]');if(masterInfo)masterInfo.textContent=purchaseMasterPriceInfo(find('parts',line.part));
    const quantities=purchaseStockQuantities(record,line,jobDraft.id);
    for(const key of ['existing','total']){const output=document.querySelector('[data-purchase-stock="'+i+'|'+key+'"]');if(output)output.textContent=line.part?purchaseStockText(quantities[key],quantities.unit):'—'}
  }
  for(const node of document.querySelectorAll('[data-purchase-count]'))node.textContent=record.partLines.length+' '+(record.partLines.length===1?'ITEM':'ITEMS');
  const subtotal=document.getElementById('purchaseItemsTotal');if(subtotal)subtotal.textContent=money(billTotals(record).total);
}
function renderPurchaseItems(){
  const record=jobDraft.record,container=document.getElementById('partLines');if(!container)return;
  const stockLocation=record.stockLocation==='godown'?'godown':'main',stockLabel=stockLocation==='godown'?'GODOWN STOCK':'MAIN STOCK',totalStockLabel=stockLocation==='godown'?'TOTAL GODOWN STOCK':'TOTAL MAIN STOCK';
  const heading=container.previousElementSibling;
  if(heading?.classList.contains('lineheading')){
    heading.classList.add('purchaseItemHeading');
    heading.innerHTML='<span>PURCHASE PARTS ITEMS <b data-purchase-count></b></span><button type="button" class="btn small" data-purchase-add>+ ADD ITEM</button>';
    heading.querySelector('[data-purchase-add]').onclick=()=>{jobDraft.record.partLines.push(newPurchaseItem());lineRender();document.querySelector('[data-purchase-lookup="'+(jobDraft.record.partLines.length-1)+'|code"]')?.focus()};
  }
  const codeOptions=db.parts.map(p=>'<option value="'+esc(p.id)+'" label="'+esc(p.name+(p.hsn?' · HSN: '+p.hsn:''))+'"></option>').join('');
  const nameOptions=db.parts.map(p=>{const quantities=purchaseStockQuantities(record,{part:p.id},jobDraft.id);return '<option value="'+esc(p.name)+'" label="'+esc('Current '+stockLocation+' stock: '+purchaseStockText(quantities.existing,quantities.unit)+' · After purchase: '+purchaseStockText(quantities.total,quantities.unit)+(p.hsn?' · HSN: '+p.hsn:''))+'"></option>'}).join('');
  const vendorOptions=purchaseVendorOptions(record);
  const rows=record.partLines.map((line,i)=>{
    const part=find('parts',line.part),hsn=line.hsn??part?.hsn??'',code=line.partCode??line.part??'',partName=part?purchasePartNameValue({...part,name:line.name??part.name}):(line.name??''),nonGst=record.invoiceType==='non-gst';
    const gstRates=[...new Set([...(list('GST Rates')||[0,5,10,12,18,24,28]).map(Number),Number(line.gst||0)])].sort((a,b)=>a-b);
    const vendor=line.vendor||record.supplier||'';
    return '<tr><td>'+(i+1)+'</td><td><input type="text" list="purchasePartCodes" autocomplete="off" required data-purchase-lookup="'+i+'|code" aria-label="Part code '+(i+1)+'" placeholder="Part Code" value="'+esc(code)+'"></td><td><input type="text" list="purchasePartNames" autocomplete="off" required data-purchase-lookup="'+i+'|name" aria-label="Part name '+(i+1)+'" placeholder="Part Name" value="'+esc(partName)+'"><small class="purchaseMasterPriceInfo" data-purchase-master-info="'+i+'">'+esc(purchaseMasterPriceInfo(part))+'</small></td><td><select data-purchase-vendor="'+i+'" aria-label="Vendor for part '+(i+1)+'"><option value="">— Select vendor —</option>'+vendorOptions.map(v=>'<option value="'+esc(v)+'" '+(v.toLocaleLowerCase()===vendor.toLocaleLowerCase()?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></td><td><input type="text" data-purchase-text="'+i+'|hsn" aria-label="HSN code '+(i+1)+'" placeholder="HSN" value="'+esc(hsn)+'"></td><td><output data-purchase-stock="'+i+'|existing" title="Current quantity at the selected stock destination"></output></td><td><output data-purchase-stock="'+i+'|total" title="Quantity after saving this purchase"></output></td><td><input type="text" inputmode="decimal" autocomplete="off" data-purchase-number="'+i+'|qty" aria-label="Quantity '+(i+1)+'" value="'+esc(line.qty??1)+'"></td><td><input type="text" inputmode="decimal" autocomplete="off" data-purchase-number="'+i+'|price" aria-label="Purchase rate for this bill '+(i+1)+'" title="Bill-specific rate saved on this invoice. Master purchase-price reference refreshes only if Main Stock plus Godown stock is zero before receipt." value="'+esc(line.price??0)+'"></td><td><select data-purchase-number="'+i+'|gst" aria-label="Purchase GST '+(i+1)+'" title="GST rate for this supplier invoice; this rate is included in the purchase total. Master GST is shown under the part name as reference.">'+gstRates.map(rate=>'<option value="'+rate+'" '+((nonGst?0:Number(line.gst||0))===rate?'selected':'')+'>'+rate+'%</option>').join('')+'</select></td><td><output data-purchase-gst-amount="'+i+'" aria-label="GST amount '+(i+1)+'">'+money(purchaseLineGst(record,line))+'</output></td><td><output id="lineAmount'+i+'" aria-label="Item total including GST '+(i+1)+'">'+money(purchaseLineTotal(record,line))+'</output></td><td><button type="button" class="btn danger small" data-purchase-remove="'+i+'" aria-label="Remove item '+(i+1)+'" title="Remove item">'+icon('trash')+'</button></td></tr>';
  }).join('');
  container.innerHTML='<datalist id="purchasePartCodes">'+codeOptions+'</datalist><datalist id="purchasePartNames">'+nameOptions+'</datalist><div class="purchaseItemScroll" role="region" aria-label="Purchase items" tabindex="0"><table class="purchaseItemsTable"><colgroup><col style="width:28px"><col style="width:110px"><col style="width:230px"><col style="width:115px"><col style="width:85px"><col style="width:90px"><col style="width:90px"><col style="width:70px"><col style="width:95px"><col style="width:70px"><col style="width:90px"><col style="width:95px"><col style="width:38px"></colgroup><thead><tr><th>#</th><th>PART CODE <span class="required">*</span></th><th>PART NAME <span class="required">*</span></th><th>VENDOR</th><th>HSN CODE</th><th title="Current quantity at the selected receiving location">'+stockLabel+'</th><th title="Quantity at the selected receiving location after saving this purchase">'+totalStockLabel+'</th><th>QTY</th><th>PURCHASE RATE (₹)</th><th>PURCHASE GST (%)</th><th>GST AMOUNT (₹)</th><th>TOTAL (₹)</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>'+rows+(!rows?'<tr><td colspan="13">Add an item to begin.</td></tr>':'')+'</tbody></table></div><div class="purchaseItemsFooter"><button type="button" class="btn secondary small" data-purchase-add>+ Add Another Item</button><span data-purchase-count></span><span>Purchase total: <strong id="purchaseItemsTotal"></strong></span></div>';
  const pricePolicy=document.createElement('p');pricePolicy.className='notice purchasePricePolicyNote';pricePolicy.textContent='Each line keeps its bill-specific rate. The master purchase-price reference updates to this receipt’s weighted average only if combined Main Stock and Godown stock was zero before receipt.';container.prepend(pricePolicy);
  updateBillTotals();
}
function syncPurchaseItemInputs(index){
  const line=jobDraft.record.partLines[index];if(!line)return;
  for(const kind of ['code','name']){const input=document.querySelector('[data-purchase-lookup="'+index+'|'+kind+'"]');if(input){input.value=kind==='code'?line.partCode:purchasePartNameValue(find('parts',line.part)||line);input.setCustomValidity('')}}
  const brand=document.querySelector('[data-purchase-brand="'+index+'"]');if(brand)brand.value=line.brand||find('parts',line.part)?.brand||'';
  const vendor=document.querySelector('[data-purchase-vendor="'+index+'"]');if(vendor)vendor.value=line.vendor||jobDraft.record.supplier||'';
  const hsn=document.querySelector('[data-purchase-text="'+index+'|hsn"]');if(hsn)hsn.value=line.hsn;
  for(const key of ['qty','price','gst']){const input=document.querySelector('[data-purchase-number="'+index+'|'+key+'"]');if(input)input.value=jobDraft.record.invoiceType==='non-gst'&&key==='gst'?0:line[key]}
}
function readPurchaseItemInput(event){
  if(jobDraft?.key!=='purchases')return;
  const input=event.target,data=input.dataset||{};
  if(data.purchaseLookup!==undefined){
    const [index,kind]=data.purchaseLookup.split('|'),line=jobDraft.record.partLines[Number(index)];if(!line)return;
    const part=purchaseLookupPart(input.value,kind,line.part);
    if(part){if(line.part!==part.id){jobDraft.record.partLines[Number(index)]=purchaseSelectedPart(line,part);syncPurchaseItemInputs(Number(index))}input.setCustomValidity('')}
    else{line.part='';if(kind==='code')line.partCode=input.value;else line.name=input.value;input.setCustomValidity(input.value?'Choose a saved part from the code or name suggestions.':'')}
    updateBillTotals();
  }else if(data.purchaseBrand!==undefined){const index=Number(data.purchaseBrand);if(jobDraft.record.partLines[index])jobDraft.record.partLines[index].brand=input.value.trim()}
  else if(data.purchaseVendor!==undefined){const index=Number(data.purchaseVendor);if(jobDraft.record.partLines[index])jobDraft.record.partLines[index].vendor=input.value.trim()}
  else if(data.purchaseText!==undefined){const [index,key]=data.purchaseText.split('|');jobDraft.record.partLines[Number(index)][key]=input.value}
  else if(data.purchaseNumber!==undefined){
    const [index,key]=data.purchaseNumber.split('|'),record=jobDraft.record;
    if(key==='gst'&&record.invoiceType==='non-gst'){
      for(const line of record.partLines)line.gst=0;
      record.invoiceType='gst';
    }
    record.partLines[Number(index)][key]=input.value.trim()===''?NaN:Number(input.value);updateBillTotals();
  }
}
const lineRenderBeforePurchaseItems=lineRender;
lineRender=function(){if(jobDraft?.key==='purchases')return renderPurchaseItems();return lineRenderBeforePurchaseItems.apply(this,arguments)};
const totalsBeforePurchaseItems=updateBillTotals;
updateBillTotals=function(){const result=totalsBeforePurchaseItems.apply(this,arguments);refreshPurchaseItemTotals();return result};
const formBeforePurchaseItems=billForm;
billForm=function(key,id,initial){
  const result=formBeforePurchaseItems.apply(this,arguments);if(key!=='purchases')return result;
  const form=document.getElementById('billForm');if(!form)return result;
  form.classList.add('purchaseEntryForm');
  form.querySelector('.savedBillingDetails')?.remove();
  if(!id&&!jobDraft.record.partLines.length){jobDraft.record.partLines.push(newPurchaseItem());lineRender()}
  const labour=document.getElementById('sumLabour')?.parentElement;if(labour)labour.style.display='none';
  const partsTitle=document.getElementById('sumParts')?.parentElement?.querySelector('span');if(partsTitle)partsTitle.textContent='Items (before GST)';
  const submit=form.querySelector('button[type="submit"]');if(submit)submit.innerHTML=icon('check')+'Save Purchase Entry';
  const title=document.getElementById('modalTitle');if(title)title.textContent=id?'Edit Purchase Entry':'Add New Purchase Entry';
  return result;
};
const saveBeforePurchaseItems=saveBill;
saveBill=function(event){
  const draft=jobDraft;if(draft?.key!=='purchases')return saveBeforePurchaseItems.apply(this,arguments);
  event.preventDefault();
  const values=Object.fromEntries(new FormData(event.target)),data={...draft.record,...values};
  data.advance=Number(data.advance||0);data.discount=Number(data.discount||0);data.tax=Number(data.tax||0);
  data.supplier=String(data.supplier||'').trim();data.invoice=String(data.invoice||'').trim();
  data.partLines=structuredClone(draft.record.partLines).map(line=>({...line,vendor:String(line.vendor||data.supplier||'').trim()}));data.serviceLines=structuredClone(draft.record.serviceLines||[]);
  const problem=purchaseItemValidation(data);if(problem)return toast(problem);
  if(!data.supplier||!data.invoice)return toast('Choose a supplier and enter the supplier invoice number.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date||'')||!Number.isFinite(Date.parse(data.date))||new Date(data.date+'T00:00:00Z').toISOString().slice(0,10)!==data.date)return toast('Enter a valid purchase date.');
  if(!find('accounts',data.account))return toast('Choose the account used for this purchase.');
  if(!Number.isFinite(data.advance)||data.advance<0||!Number.isFinite(data.discount)||data.discount<0)return toast('Enter valid paid and discount amounts.');
  const totals=billTotals(data);if(!Number.isFinite(totals.total)||totals.total<0||data.discount>totals.labour+totals.parts)return toast('Check the item amounts and purchase discount.');
  if(paid(data)>totals.total)return toast('Paid amount cannot exceed the purchase total.');
  if(draft.id&&typeof locationStock==='function'){
    const proposed=structuredClone(db),index=proposed.purchases.findIndex(p=>p.id===draft.id);
    if(index<0)return toast('This purchase no longer exists.');
    const old=proposed.purchases[index];proposed.purchases[index]=data;
    const affected=new Set([...(old.partLines||[]),...data.partLines].map(line=>line.part).filter(Boolean));
    for(const partId of affected)for(const location of ['main','godown']){
      if(locationStock(partId,location,undefined,proposed)<0)return toast('This edit would make '+(location==='main'?'Main':'Godown')+' Stock negative for '+name('parts',partId)+'.');
    }
  }
  const before=structuredClone(db),masterCostRefresh=new Map();
  if(!draft.id&&data.status!=='Cancelled'){
    const byPart=new Map();for(const line of data.partLines){const group=byPart.get(line.part)||{qty:0,cost:0};group.qty+=Number(line.qty);group.cost+=Number(line.qty)*Number(line.price);byPart.set(line.part,group)}
    for(const [partId,group] of byPart){const onHand=typeof locationStock==='function'?locationStock(partId,'main')+locationStock(partId,'godown'):stock(partId);if(onHand===0&&group.qty>0)masterCostRefresh.set(partId,round(group.cost/group.qty))}
  }
  if(draft.id){const index=db.purchases.findIndex(p=>p.id===draft.id);if(index<0)return toast('This purchase no longer exists.');db.purchases[index]=data}else db.purchases.push(data);
  for(const [partId,unitCost] of masterCostRefresh){const part=find('parts',partId);if(part)part.purchase=unitCost}
  audit(draft.id?'Update':'Create',data.id+' saved');
  if(save('Purchase entry saved')===false){db=before;return false}
  closeModal();render();return true;
};
document.addEventListener('input',readPurchaseItemInput,true);
document.addEventListener('change',readPurchaseItemInput,true);
document.addEventListener('click',event=>{
  if(jobDraft?.key!=='purchases')return;
  const button=event.target.closest('[data-purchase-add],[data-purchase-remove]');if(!button)return;
  event.preventDefault();
  if(button.hasAttribute('data-purchase-add')){jobDraft.record.partLines.push(newPurchaseItem());lineRender();document.querySelector('[data-purchase-lookup="'+(jobDraft.record.partLines.length-1)+'|code"]')?.focus()}
  else{jobDraft.record.partLines.splice(Number(button.dataset.purchaseRemove),1);lineRender()}
});
