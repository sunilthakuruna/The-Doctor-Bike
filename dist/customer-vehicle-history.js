/* History is a read-only projection of linked records, never a second ledger. */
function garageHistoryRecords(data,key,id,allowed){
 const rows=[],vehicles=(data.bikes||[]).filter(v=>key==='bikes'?v.id===id:v.customer===id),vehicleIds=new Set(vehicles.map(v=>v.id));
 const linked=r=>key==='bikes'?r.bike===id:r.customer===id||vehicleIds.has(r.bike);
 const add=(module,record,type,date,details)=>{if(allowed(module))rows.push({module,record,type,date:date||'',details:details||''})};
 if(allowed('bikes'))for(const v of vehicles){
  add('bikes',v,'Vehicle',v.date||v.created_at,[v.number,v.brand||v.make,v.model].filter(Boolean).join(' · '));
  if(v.amcScope==='vehicle'&&v.amcType)add('amc-plans',v,'AMC',v.amcStart,[v.amcType,'Valid until '+(v.amcExpiry||'—')].join(' · '));
  if(v.nextServiceDate)add('service-reminders',v,'Service due',v.nextServiceDate,v.nextServiceType);
 }
 const bills=[];
 for(const module of ['jobs','sales'])if(allowed(module))for(const r of data[module]||[])if(linked(r)){
  bills.push(r);add(module,r,module==='jobs'?'Job card / Invoice':'Counter sale / Invoice',r.date,[r.work,r.km||r.odometer? 'Odometer: '+(r.km||r.odometer):''].filter(Boolean).join(' · '));
 }
 if(allowed('payments')){
  const ids=new Set(bills.map(r=>r.id));
  for(const r of data.receipts||[])if(ids.has(r.bill))add('payments',r,'Payment receipt',r.date,[r.bill,r.mode,r.ref].filter(Boolean).join(' · '));
  for(const r of bills)if(Number(r.advance)>0)add('payments',{id:r.id+'-advance',amount:r.advance,bill:r.id,mode:r.mode},'Advance payment',r.advanceDate||r.date,r.id);
 }
 for(const r of data.insurance||[])if(linked(r))add('insurance',r,'Insurance policy',r.issue,[r.policy,r.provider,'Expiry: '+(r.expiry||'—')].filter(Boolean).join(' · '));
 for(const r of data.appointments||[])if(linked(r))add('appointments',r,'Appointment',r.date,r.work||r.service||r.notes);
 return rows.sort((a,b)=>b.date.localeCompare(a.date)||String(b.record.id).localeCompare(String(a.record.id)));
}
(()=>{
 const allowed=key=>typeof window.BD_HAS_MODULE_ACCESS==='function'&&window.BD_HAS_MODULE_ACCESS(key);
 const oldActions=actions;
 actions=function(key,id,extra=''){
  if(['customers','bikes'].includes(key)&&allowed(key))extra+='<button type="button" class="btn small garageHistoryButton" data-garage-history="'+key+'|'+esc(id)+'" title="View history">'+icon('clock')+' History</button>';
  return oldActions(key,id,extra);
 };
 const formatDate=value=>value?(typeof uiDate==='function'?uiDate(value.slice(0,10)):value.slice(0,10)):'—';
 const field=(label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value??'—')+'</dd></div>';
 function openHistory(key,id){
  if(!allowed(key))return toast('You do not have access to this module.');
  const record=find(key,id);if(!record)return toast('Record no longer available.');
  const rows=garageHistoryRecords(db,key,id,allowed);
  const title=(key==='customers'?'Customer':'Vehicle')+' History — '+(record.name||record.number||id);
  const billRows=rows.filter(r=>['jobs','sales'].includes(r.module)&&r.record.status!=='Cancelled');
  const billed=billRows.reduce((n,r)=>n+billTotals(r.record).total,0);
  const received=billRows.reduce((n,r)=>n+paid(r.record),0),balance=billRows.reduce((n,r)=>n+due(r.record),0);
  openModal(title,'<section class="formbody garageHistory"><p>Linked records, newest date first. Only modules you may access are shown.</p>'+(billRows.length?'<div class="garageHistoryTotals"><span>Billed <b>'+money(billed)+'</b></span>'+(allowed('payments')?'<span>Received <b>'+money(received)+'</b></span><span>Outstanding <b>'+money(balance)+'</b></span>':'')+'</div>':'')+'<div class="tablewrap"><table><thead><tr><th>Date</th><th>Record</th><th>Activity</th><th>Details</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><td>'+esc(formatDate(r.date))+'</td><td>'+esc(r.record.id)+'</td><td>'+esc(r.type)+'</td><td>'+esc(r.details)+'</td><td>'+(['jobs','sales'].includes(r.module)?money(billTotals(r.record).total):r.module==='payments'?money(r.record.amount):'—')+'</td><td>'+esc(r.record.status||'—')+'</td><td><button type="button" class="btn small garageHistoryButton" data-history-view="'+i+'">View</button></td></tr>').join('')+(rows.length?'':'<tr><td colspan="7">No linked history is available for your permitted modules.</td></tr>')+'</tbody></table></div></section>');
  document.querySelectorAll('#modalBody [data-history-view]').forEach(button=>button.onclick=()=>{
   const row=rows[Number(button.dataset.historyView)];if(!allowed(key)||!allowed(row.module))return toast('Access is no longer available.');
   const r=row.record;let details=field('Record',r.id)+field('Activity',row.type)+field('Date',formatDate(row.date))+field('Details',row.details)+field('Status',r.status);
   if(['jobs','sales'].includes(row.module)){
    details+=field('Invoice total',money(billTotals(r).total));
    if(allowed('payments'))details+=field('Received',money(paid(r)))+field('Due',money(due(r)));
    details+=field('Services',(r.serviceLines||[]).map(l=>(allowed('services')?name('services',l.service):l.service)+' — '+money(l.charge)).join('; ')||'None');
    details+=field('Spare parts',(r.partLines||[]).map(l=>(allowed('parts')?name('parts',l.part):l.part)+' × '+l.qty+' — '+money(l.price)).join('; ')||'None');
    details+=field('Miscellaneous items',(r.miscellaneousLines||[]).map(l=>l.name+' × '+l.qty+' — '+money(Number(l.qty)*Number(l.price))).join('; ')||'None');
   }
   if(row.module==='payments')details+=field('Amount',money(r.amount))+field('Bill',r.bill)+field('Payment mode',r.mode);
   openModal(row.type+' — '+r.id,'<section class="formbody garageHistory"><dl>'+details+'</dl><button type="button" class="btn garageHistoryButton" id="historyBack">Back to History</button></section>');
   document.querySelector('#historyBack').onclick=()=>openHistory(key,id);
  });
 }
 document.addEventListener('click',event=>{const button=event.target.closest('[data-garage-history]');if(!button)return;event.preventDefault();openHistory(...button.dataset.garageHistory.split('|'))});
 if(['customers','bikes'].includes(page))render();
})();
