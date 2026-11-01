/* Prepare an editable, individually addressed promotional message. */
(function(){
  const customerActionsBeforePromo=actions;
  actions=function(key,id,extra=''){
    if(key==='customers')extra+=`<button type="button" class="btn small success" data-customer-promo="${esc(id)}" title="WhatsApp promotional message" aria-label="WhatsApp promotional message">${whatsappIcon()} WhatsApp</button>`;
    return customerActionsBeforePromo(key,id,extra);
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-customer-promo]');if(!button)return;
    const customer=find('customers',button.dataset.customerPromo);if(!customer)return;
    messagePreview(customer.mobile,`Hello ${customer.name||''},\n\n${db.settings.name||'Our garage'}: \n\nThank you.`);
  });
  if(page==='customers')render();
})();
