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
  new MutationObserver(()=>enhance(document)).observe(document.documentElement,{childList:true,subtree:true});
  enhance(document);
})();
