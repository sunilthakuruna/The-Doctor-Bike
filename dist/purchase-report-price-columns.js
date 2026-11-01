/* Add purchase price details to the rendered Purchase Report table. */
(function(){
  function enhance(){
    if(typeof page==='undefined'||page!=='report-purchases')return;
    const table=document.querySelector('#content .tablewrap table');
    if(!table||table.dataset.purchasePriceColumns==='1')return;
    const header=table.tHead?.rows[0];
    if(!header)return;
    const cells=[...header.cells];
    const supplierIndex=cells.findIndex(cell=>cell.textContent.trim()==='Supplier');
    if(supplierIndex>=0){
      const invoiceHeader=document.createElement('th');
      invoiceHeader.textContent='Invoice No.';
      header.insertBefore(invoiceHeader,header.cells[supplierIndex+1]);
    }
    const unitIndex=[...header.cells].findIndex(cell=>cell.textContent.trim()==='Unit Price');
    const totalIndex=[...header.cells].findIndex(cell=>cell.textContent.trim()==='Total');
    if(unitIndex<0||totalIndex<0)return;
    header.cells[unitIndex].textContent='Price / Unit (₹)';
    header.cells[totalIndex].textContent='Total Purchase Price (₹)';
    const gstHeader=document.createElement('th');
    gstHeader.textContent='GST (%)';
    header.insertBefore(gstHeader,header.cells[totalIndex]);
    const gstAmountHeader=document.createElement('th');
    gstAmountHeader.textContent='GST Amount (₹)';
    header.insertBefore(gstAmountHeader,header.cells[totalIndex+1]);
    [...table.tBodies].forEach(body=>[...body.rows].forEach(row=>{
      if(row.cells.length<totalIndex+1)return;
      const billId=row.cells[0]?.textContent.trim();
      const bill=(db.purchases||[]).find(item=>item.id===billId);
      const invoiceCell=document.createElement('td');
      invoiceCell.textContent=bill?.invoice||'—';
      row.insertBefore(invoiceCell,row.cells[3]);
      const partIndex=[...header.cells].findIndex(cell=>cell.textContent.trim()==='SKU');
      const qtyIndex=[...header.cells].findIndex(cell=>cell.textContent.trim()==='Qty');
      const line=(bill?.partLines||[]).find(item=>String(item.part)===row.cells[partIndex]?.textContent.trim())||bill?.partLines?.[0];
      const qty=Number(row.cells[qtyIndex]?.textContent||0);
      const unit=Number(line?.price||0);
      const rate=Number(line?.gst||0);
      const gst=unit*qty*rate/100;
      const total=unit*qty+gst;
      const gstCell=document.createElement('td');gstCell.textContent=rate+'%';
      const gstAmountCell=document.createElement('td');gstAmountCell.textContent=money(gst);
      row.insertBefore(gstCell,row.cells[totalIndex]);
      row.insertBefore(gstAmountCell,row.cells[totalIndex+1]);
      row.cells[totalIndex+2].textContent=money(total);
    }));
    table.dataset.purchasePriceColumns='1';
  }
  const originalRender=window.render;
  if(typeof originalRender==='function'){
    window.render=function(){const result=originalRender.apply(this,arguments);enhance();return result};
  }
  document.addEventListener('DOMContentLoaded',enhance);
  setTimeout(enhance,0);
})();
