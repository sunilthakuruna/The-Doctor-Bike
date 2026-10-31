/* Regular invoices are printed only on A4 or A5. Thermal remains a separate receipt format. */
for(let i=invoicePaperSizes.length-1;i>=0;i--)if(!['A4','A5'].includes(invoicePaperSizes[i].id))invoicePaperSizes.splice(i,1);
for(let paper of invoicePaperSizes)if(!paper.height)paper.height=paper.id==='A5'?210:297;
if(!['A4','A5'].includes(db.settings.invoicePaperSize))db.settings.invoicePaperSize='A4';
function invoicePaperOptions(selected){return opts(invoicePaperSizes.map(p=>({value:p.id,label:p.name+' ('+p.dimensions+')'})),selected)}
printA4Invoice=function(){let paper=invoicePaperSizes.find(p=>p.id===supportedInvoicePaper(activeInvoicePaper))||invoicePaperSizes[0];clearInvoicePrintMode();let style=document.createElement('style');style.id='a4PageSize';style.textContent='@media print{@page{size:'+paper.width+'mm '+paper.height+'mm;margin:10mm}body.printingA4 .invoice{width:100%!important;max-width:'+(paper.width-20)+'mm!important}}';document.head.appendChild(style);document.body.classList.add('printingA4');let cleanup=()=>{clearInvoicePrintMode();window.removeEventListener('afterprint',cleanup)};window.addEventListener('afterprint',cleanup);try{window.print()}catch{cleanup();toast('Use the browser print menu.')}};
const settingsBeforeMorePaper=settingsPage;
settingsPage=function(){return settingsBeforeMorePaper().replace(/(<select id="settingsPrintPaper"[^>]*>)[\s\S]*?<\/select>/,(_,open)=>open+invoicePaperOptions(supportedInvoicePaper(db.settings.invoicePaperSize))+'<option value="58">Thermal 58 mm</option><option value="80">Thermal 80 mm</option></select>')};
const applyPaperBeforeMoreSizes=applyInvoicePaper;
applyInvoicePaper=function(){applyPaperBeforeMoreSizes();let sheet=$('#modalBody .invoice');if(sheet)sheet.classList.toggle('smallInvoicePaper',invoicePaperSizes.find(p=>p.id===activeInvoicePaper)?.width<=176)};
render();
