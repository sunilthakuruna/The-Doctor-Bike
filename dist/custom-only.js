/* Supersedes preset styles with a single base and the custom layout designer. */
selectedInvoiceStyle=function(){return 'classic'};
applyInvoiceStyle=function(sheet){if(!sheet)return;for(let style of invoiceStyles)sheet.classList.remove('invoiceStyle-'+style.id);sheet.style.setProperty('--invoice-accent',invoiceStyleColor())};
applyThermalStyle=function(sheet){if(!sheet)return;for(let style of invoiceStyles)sheet.classList.remove('thermalStyle-'+style.id)};
function removePresetSelectors(){for(let id of ['#previewInvoiceStyle','#thermalStyleChoice'])$(id)?.closest('label')?.remove()}
const invoiceWithoutPresets=invoice;
invoice=function(key,id,paper){invoiceWithoutPresets(key,id,paper);removePresetSelectors()};
const thermalWithoutPresets=openThermalInvoice;
openThermalInvoice=function(key,id,width){thermalWithoutPresets(key,id,width);removePresetSelectors()};
const settingsWithoutPresets=settingsPage;
settingsPage=function(){let html=settingsWithoutPresets();let start=html.indexOf('<section class="panel"><div class="panelhead"><h2>Invoice Formatting</h2>');if(start>=0){let end=html.indexOf('</section>',start);if(end>=0)html=html.slice(0,start)+html.slice(end+10)}return html};
render();
