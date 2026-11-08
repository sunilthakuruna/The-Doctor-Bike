/* Editable WhatsApp message templates. Dynamic placeholders are resolved at send time. */
(function(){
  const defaults={
    invoice:{label:'Job Card / Invoice',required:['{garage_name}','{customer_name}','{vehicle_number}','{invoice_number}','{invoice_total}','{paid_amount}','{balance_due}'],body:'Hello {customer_name},\n\nThank you for choosing *{garage_name}*.\n\nVehicle: *{vehicle_number}*\nInvoice: {invoice_number}\nDate: {invoice_date}\nTotal: *{invoice_total}*\nPaid: {paid_amount}\nBalance Due: {balance_due}\n\nPlease share your experience at our garage during vehicle servicing and how your vehicle is running after service.\n\nIf the same issue related to this work returns within *15 days of delivery*, we will rectify it *without additional labour charges*. Any replacement parts will be charged separately.\n\n{garage_phone}'},
    payment_due:{label:'Payment Due Reminder',required:['{garage_name}','{customer_name}','{invoice_number}','{invoice_total}','{paid_amount}','{balance_due}'],body:'{garage_name}\nPayment Due Reminder\nCustomer: {customer_name}\nBill: {invoice_number}\nDate: {invoice_date}\nTotal: {invoice_total}\nPaid: {paid_amount}\nBalance Due: {balance_due}\n\nThank you.'},
    amc_reminder:{label:'AMC Reminder',required:['{garage_name}','{customer_name}','{vehicle_number}','{amc_expiry_date}'],body:'Hello {customer_name} 👋\n\nYour {amc_type} AMC plan for {vehicle_number} {amc_status} {amc_expiry_date}.\n\nPlease contact {garage_name} to renew your AMC.\n{garage_phone}\n\nThank you for choosing us.'},
    service_reminder:{label:'Service Reminder',required:['{garage_name}','{customer_name}','{vehicle_number}','{service_due_date}'],body:'Hello {customer_name} 👋\n\nIt is time for the next service of your vehicle {vehicle_number}.\n{service_status} {service_due_date}\n\nBook your service with {garage_name}.\n{garage_phone}\n\nThank you for trusting us.'}
  };
  const clone=o=>JSON.parse(JSON.stringify(o));
  function ensure(){
    db.settings=db.settings||{};
    db.settings.messageTemplates=db.settings.messageTemplates||{};
    for(const [key,value] of Object.entries(defaults)) if(!db.settings.messageTemplates[key]) db.settings.messageTemplates[key]=value.body;
  }
  function template(key,fallback){ensure();return db.settings.messageTemplates[key]||fallback||defaults[key]?.body||''}
  function render(key,values,fallback){let text=template(key,fallback);return text.replace(/\{([a-z0-9_]+)\}/gi,(m,k)=>values[k]===undefined||values[k]===null?'':String(values[k])).replace(/[ \t]+\n/g,'\n').trim()}
  window.renderWhatsAppTemplate=render;
  window.whatsAppMessageTemplates=defaults;
  function customerFor(record){return typeof find==='function'?find('customers',record.customer):null}
  function invoiceValues(b){
    const c=customerFor(b), bike=typeof find==='function'?find('bikes',b.bike):null;
    const total=typeof billTotals==='function'?billTotals(b).total:0, paidValue=typeof paid==='function'?paid(b):0;
    return {garage_name:db.settings.name||'BIKE DOCTOR',garage_phone:db.settings.phone||'',customer_name:c?.name||b.customerName||b.walkin||'Customer',vehicle_number:b.vehicleNumber||(typeof number==='function'?number(b.bike):'—')||'—',invoice_number:b.sourceId||b.id||'',invoice_date:typeof displayDate==='function'?displayDate(b.date):b.date||'',invoice_total:typeof money==='function'?money(total):total,paid_amount:typeof money==='function'?money(paidValue):paidValue,balance_due:typeof money==='function'?(money(typeof due==='function'?due(b):total-paidValue)):total-paidValue,brand:bike?.brand||'',model:bike?.model||''};
  }
  const originalJob=window.jobInvoiceWhatsAppMessage;
  window.jobInvoiceWhatsAppMessage=function(b){return render('invoice',invoiceValues(b),originalJob?originalJob(b):'')};
  const originalAmc=window.amcExpiryMessage;
  window.amcExpiryMessage=function(c){
    const days=typeof amcExpiryDays==='function'?amcExpiryDays(c):null,vehicle=c.vehicleNumber||c.vehicleNumbers||c.number||'your vehicle';
    return render('amc_reminder',{garage_name:db.settings.name||'Our Garage',garage_phone:db.settings.phone||'',customer_name:c.name||'Customer',vehicle_number:vehicle,amc_type:c.amcType||'AMC',amc_status:days!==null&&days<0?'expired on':'is expiring on',amc_expiry_date:c.amcExpiry||''},originalAmc?originalAmc(c):'');
  };
  const originalService=window.vehicleServiceMessage;
  window.vehicleServiceMessage=function(b){
    const c=customerFor(b),days=typeof serviceDueDays==='function'?serviceDueDays(b):null;
    return render('service_reminder',{garage_name:db.settings.name||'Our Garage',garage_phone:db.settings.phone||'',customer_name:c?.name||'Customer',vehicle_number:b.number||'',service_status:days!==null&&days<0?'The service was due on':'The service is due on',service_due_date:b.nextServiceDate||''},originalService?originalService(b):'');
  };
  function panel(){
    ensure();
    const selected=document.querySelector('#messageTemplateSelect')?.value||'invoice', item=defaults[selected];
    return `<section class="panel messageTemplatePanel"><div class="panelhead"><h2>WhatsApp Message Templates</h2><span class="badge info">Dynamic values protected</span></div><div class="panelbody"><p>Edit the wording used when preparing WhatsApp messages. Values in braces are filled automatically from the saved record.</p><label class="field"><span>Message type</span><select id="messageTemplateSelect" aria-label="WhatsApp message template">${Object.entries(defaults).map(([k,v])=>`<option value="${k}" ${k===selected?'selected':''}>${v.label}</option>`).join('')}</select></label><label class="field"><span>Message text</span><textarea id="messageTemplateBody" rows="12" aria-label="WhatsApp message template text">${esc(db.settings.messageTemplates[selected]||item.body)}</textarea></label><p class="templateTokens"><strong>Protected values:</strong> ${item.required.join(' · ')}</p><div class="formactions"><button type="button" class="btn secondary" id="resetMessageTemplate">Restore default wording</button><button type="button" class="btn success" id="saveMessageTemplate">Save Message Template</button></div><p class="small muted">The saved message remains editable, but protected values are always taken from the current customer, vehicle, invoice, AMC or service record.</p></div></section>`;
  }
  const originalLists=window.listsPage;
  if(originalLists) window.listsPage=function(){let html=originalLists.apply(this,arguments);return html+panel()};
  document.addEventListener('change',e=>{if(e.target.id!=='messageTemplateSelect')return;const body=document.querySelector('#messageTemplateBody');if(body){ensure();body.value=db.settings.messageTemplates[e.target.value]||defaults[e.target.value].body;}});
  document.addEventListener('click',e=>{
    if(e.target.id==='resetMessageTemplate'){const key=document.querySelector('#messageTemplateSelect')?.value;if(key)document.querySelector('#messageTemplateBody').value=defaults[key].body;return}
    if(e.target.id!=='saveMessageTemplate')return;
    const key=document.querySelector('#messageTemplateSelect')?.value, body=document.querySelector('#messageTemplateBody')?.value||'', item=defaults[key];
    if(!key||!item)return;
    const missing=item.required.filter(token=>!body.includes(token));
    if(missing.length){toast('Keep these automatic values in the message: '+missing.join(', '));return}
    ensure();db.settings.messageTemplates[key]=body;save('WhatsApp message template saved');toast('WhatsApp message template saved');
  });
})();
