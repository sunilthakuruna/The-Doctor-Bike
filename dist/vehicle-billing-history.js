/* Vehicle Master shows history for that exact registration, never combined customer history. */
(function(){
  function vehicleBillingHistory(vehicleId){
    const vehicle=find('bikes',vehicleId);if(!vehicle)return {rows:[],total:0,paid:0,due:0};
    const matches=bill=>bill.bike===vehicleId||String(bill.vehicleNumber||'').trim().toUpperCase()===String(vehicle.number||'').trim().toUpperCase();
    const rows=[...db.jobs.map(bill=>({kind:'Job Card',bill})),...db.sales.map(bill=>({kind:'Spare Parts Sale',bill}))]
      .filter(({bill})=>matches(bill)&&bill.status!=='Cancelled')
      .map(({kind,bill})=>({id:bill.id,date:bill.date||'',kind,status:bill.status||'Completed',total:billTotals(bill).total,paid:paid(bill),due:due(bill)}))
      .sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
    return {rows,total:round(rows.reduce((sum,row)=>sum+row.total,0)),paid:round(rows.reduce((sum,row)=>sum+row.paid,0)),due:round(rows.reduce((sum,row)=>sum+row.due,0))};
  }
  function vehicleBillingMarkup(vehicleId){
    const vehicle=find('bikes',vehicleId),history=vehicleBillingHistory(vehicleId);
    if(!vehicle)return '<strong>Previous Billing for This Vehicle</strong><p>Save the vehicle first to see its billing history.</p>';
    if(!history.rows.length)return `<strong>Previous Billing for ${esc(vehicle.number)}</strong><p>No saved job cards or spare-parts sales are linked to this vehicle yet.</p>`;
    const rows=history.rows.map(row=>`<div class="customerHistoryRow"><div><strong>${esc(row.id)}</strong><small>${esc(displayDate(row.date))} · ${esc(row.kind)} · ${esc(row.status)}</small></div><div>Total <b>${money(row.total)}</b> · Paid ${money(row.paid)} · Due <b class="${row.due>0?'historyDue':''}">${money(row.due)}</b></div></div>`).join('');
    return `<div class="customerHistoryHeading"><strong>Previous Billing for ${esc(vehicle.number)} (${history.rows.length})</strong><span>Outstanding: <b class="historyDue">${money(history.due)}</b></span></div><small class="historySummary">Total billed ${money(history.total)} · Total received ${money(history.paid)} · This vehicle only</small>${rows}`;
  }
  const editBeforeVehicleBillingHistory=editRecord;
  editRecord=function(key,id,initial){
    editBeforeVehicleBillingHistory(key,id,initial);
    if(key!=='bikes')return;
    const form=$('#recordForm'),vehicleId=id||initial?.id;if(!form||!vehicleId||form.querySelector('.vehicleBillingHistoryPanel'))return;
    const panel=document.createElement('section');panel.className='customerHistoryPanel vehicleBillingHistoryPanel';panel.setAttribute('aria-live','polite');panel.innerHTML=vehicleBillingMarkup(vehicleId);
    const details=form.querySelector('.savedBillingDetails');
    if(details)details.after(panel);else form.querySelector('.formbody')?.appendChild(panel);
  };
})();
