'use strict';
/* Keep each vehicle's service schedule visible in Vehicle Master. */
function vehicleMasterServiceDue(vehicle){
  if(!vehicle.nextServiceDate)return '<span class="badge">Not Scheduled</span>';
  const date=typeof displayDate==='function'?displayDate(vehicle.nextServiceDate):vehicle.nextServiceDate;
  const status=typeof serviceDueStatus==='function'?serviceDueStatus(vehicle):'Scheduled';
  const days=typeof serviceDueDays==='function'?serviceDueDays(vehicle):null;
  const detail=days===null?'':days<0?Math.abs(days)+' days overdue':days===0?'Due today':days+' days remaining';
  return `<strong>${esc(date)}</strong><small>${esc(status)}${detail?' · '+esc(detail):''}</small>`;
}
bikesPage=function(){
  const rows=db.bikes.filter(vehicle=>matches({...vehicle,customerName:name('customers',vehicle.customer),customerMobile:find('customers',vehicle.customer)?.mobile||''}));
  const content=rows.length?table(['Vehicle No.','Vehicle Make / Model','Customer','Mobile','Type','AMC Coverage','Next Service Due','Actions'],rows.map(vehicle=>[
    `<strong>${esc(vehicle.number)}</strong><small>${esc(vehicle.id)}</small>`,
    `<strong>${esc(vehicle.brand)} ${esc(vehicle.model)}</strong><small>${esc([vehicle.variant,vehicle.year].filter(Boolean).join(' · ')||'—')}</small>`,
    esc(name('customers',vehicle.customer)),esc(find('customers',vehicle.customer)?.mobile||'—'),badge(vehicle.type),vehicleAmcSummary(vehicle),vehicleMasterServiceDue(vehicle),actions('bikes',vehicle.id)
  ])):'<div class="empty">No vehicles found. Add a vehicle to get started.</div>';
  return toolbar('Add Vehicle').replace('Search by name, number or ID…','Search by vehicle number, customer name or mobile number…')+content;
};
render();
