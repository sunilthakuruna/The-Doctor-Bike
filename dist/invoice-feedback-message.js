/* Default job-invoice message. WhatsApp still requires the user to send it. */
function jobInvoiceWhatsAppMessage(b){
 const customer=find('customers',b.customer),garage=db.settings.name||'BIKE DOCTOR';
 const customerName=customer?.name||b.customerName||b.walkin||'Customer';
 const date=typeof displayDate==='function'?displayDate(b.date):b.date;
 return `Hello ${customerName},

Thank you for choosing *${garage}*.

Vehicle: *${b.vehicleNumber||number(b.bike)||'—'}*
Invoice: ${b.sourceId||b.id}
Date: ${date||'—'}
Total: *${money(billTotals(b).total)}*
Paid: ${money(paid(b))}
Balance Due: ${money(due(b))}

Please share your experience at our garage during vehicle servicing and how your vehicle is running after service.

If the same issue related to this work returns within *15 days of delivery*, we will rectify it *without additional labour charges*. Any replacement parts will be charged separately.

${db.settings.phone||''}`.trim();
}
const invoiceShareMessageBeforeFeedback=invoiceShareMessage;
invoiceShareMessage=function(b){
 return (db.jobs||[]).some(job=>job.id===b.id)?jobInvoiceWhatsAppMessage(b):invoiceShareMessageBeforeFeedback(b);
};

// Keep the message visible before entering a device file-share menu.
const shareBundleBeforeInvoiceMessage=shareSavedRecordBundleNow;
shareSavedRecordBundleNow=function(key,id,phone,message){
 if(key==='jobs'){const record=find(key,id);if(!record)return false;messagePreview(phone,message||jobInvoiceWhatsAppMessage(record),{key,id});return Promise.resolve(false)}
 return shareBundleBeforeInvoiceMessage.apply(this,arguments);
};
