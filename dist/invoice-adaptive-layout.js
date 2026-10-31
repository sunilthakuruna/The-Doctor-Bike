/* Select a readable density from the paper size and the number of invoice rows. */
function applyAdaptiveInvoiceLayout(){
  const sheet=$('#modalBody .invoice');
  if(sheet){
    const paper=sheet.dataset.paper||activeInvoicePaper||'A4';
    const rows=sheet.querySelectorAll('tbody tr').length;
    const level=paper==='A5'?(rows>12?2:rows>7?1:0):(rows>18?2:rows>11?1:0);
    sheet.dataset.adaptivePaper=paper;
    sheet.dataset.adaptiveDensity=String(level);
  }
  const receipt=$('#modalBody .thermalInvoice');
  if(receipt){
    const rows=receipt.querySelectorAll('tbody tr').length;
    receipt.dataset.adaptiveDensity=String(rows>18?2:rows>9?1:0);
  }
}
const invoiceBeforeAdaptiveLayout=invoice;
invoice=function(key,id,paper){invoiceBeforeAdaptiveLayout(key,id,paper);applyAdaptiveInvoiceLayout()};
const thermalBeforeAdaptiveLayout=openThermalInvoice;
openThermalInvoice=function(key,id,width){thermalBeforeAdaptiveLayout(key,id,width);applyAdaptiveInvoiceLayout()};
