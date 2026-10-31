/* Add customer-vs-vendor payment direction to the audit history. */
(function(){
  const renderBeforePaymentAuditPartyTypes=render;
  function vendorPayments(){
    return (db.purchases||[])
      .filter(purchase=>Number(purchase.advance||0)>0)
      .filter(purchase=>matches({...purchase,party:purchase.supplier||'',paymentType:'Vendor Payment'}));
  }
  function addAuditPartyTypes(){
    if(page!=='payments'||tabState!=='history')return;
    const records=$('#content .paymentRecords');
    const tableEl=records?.querySelector('table');
    if(!records||!tableEl||tableEl.dataset.auditPartyTypes)return;
    tableEl.dataset.auditPartyTypes='true';
    const header=tableEl.querySelector('thead tr');
    if(!header)return;
    header.insertAdjacentHTML('beforeend','<th>PARTY TYPE</th><th>CASH FLOW</th>');
    for(const row of tableEl.querySelectorAll('tbody tr')){
      row.insertAdjacentHTML('beforeend','<td><span class="auditPartyBadge customer">Customer</span></td><td><span class="auditFlow in">Money In</span></td>');
    }
    for(const purchase of vendorPayments()){
      const row=document.createElement('tr');
      row.innerHTML=`<td>${esc(purchase.id+'-PAID')}</td><td>${esc(purchase.date)}</td><td><strong>${esc(purchase.supplier||'—')}</strong></td><td>${esc(purchase.id)}</td><td>${money(purchase.advance)}</td><td>${esc(purchase.mode||'Cash')}</td><td>${esc(name('accounts',purchase.account)||'—')}</td><td><span class="auditPartyBadge vendor">Vendor</span></td><td><span class="auditFlow out">Money Out</span></td>`;
      tableEl.querySelector('tbody').append(row);
    }
  }
  render=function(){renderBeforePaymentAuditPartyTypes();addAuditPartyTypes()};
})();
