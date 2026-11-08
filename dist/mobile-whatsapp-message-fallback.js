/* Make the reliable mobile fallback prominent when WhatsApp drops text from a file share. */
(function(){
  function enhance(root){
    const link=(root||document).querySelector?.('#openCustomerWhatsapp');
    if(!link)return;
    link.textContent='Open WhatsApp with Message';
    link.title='Open the customer chat with the invoice message already filled in';
    link.classList.add('mobileMessageFallback');
    const share=(root||document).querySelector?.('#shareInvoiceMedia');
    if(share&&!share.dataset.mobileMessageHint){
      share.dataset.mobileMessageHint='1';
      share.addEventListener('click',()=>setTimeout(()=>{
        const status=(root||document).querySelector?.('#invoiceMediaStatus');
        if(status&&/handed to the device share menu/i.test(status.textContent))
          status.textContent='Invoice file ready. If WhatsApp shows only the file, tap “Open WhatsApp with Message” above; the default message will be filled in automatically.';
      },300),false);
    }
  }
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('[data-extra-action="whatsapp"],#openInvoiceWhatsapp,[data-invoice-media]'))return;
    setTimeout(()=>enhance(document),150);
  },false);
  enhance(document);
})();
