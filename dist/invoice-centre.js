/* Keep every invoice configuration control together without breaking the main settings form. */
(function(){
  const isInvoicePanel=panel=>{
    const heading=panel.querySelector('.panelhead h2,h2,h3')?.textContent||'';
    return /invoice|template|layout|paper size|thermal|print preview|invoice samples/i.test(heading) && !/upi scan code|invoice stamp|bank & payment gateway|payment details/i.test(heading);
  };
  const isPaymentPanel=panel=>{
    const heading=panel.querySelector('.panelhead h2,h2,h3')?.textContent||'';
    return /upi scan code|invoice stamp|bank & payment gateway|payment details/i.test(heading);
  };
  function groupInvoiceControls(){
    if(page!=='settings')return;
    const form=$('#settingsForm');if(!form||form.querySelector('.invoiceCentre'))return;
    const all=Array.from($('#content').querySelectorAll('.panel'));
    const panels=all.filter(isInvoicePanel),paymentPanels=all.filter(isPaymentPanel);
    if(!panels.length&&!paymentPanels.length)return;
    const hub=document.createElement('section');hub.className='panel invoiceCentre';
    hub.innerHTML=`<div class="panelhead"><h2>${icon('file')}Invoice Centre</h2><span class="badge info">Design, templates & print setup</span></div><div class="panelbody"><p class="invoiceCentreIntro">Manage all invoice-related settings in one place. Changes to a template affect the invoice design only; bill data and totals remain automatic.</p><div class="invoiceCentrePanels"></div></div>`;
    const insertBefore=Array.from(form.children).find(node=>node.classList?.contains('toolbar'));
    form.insertBefore(hub,insertBefore||null);
    const target=hub.querySelector('.invoiceCentrePanels');
    panels.forEach(panel=>target.appendChild(panel));
    if(paymentPanels.length){
      const paymentHub=document.createElement('section');paymentHub.className='panel paymentSettingsCentre';
      paymentHub.innerHTML=`<div class="panelhead"><h2>${icon('wallet')}Payment & Bank Settings</h2><span class="badge info">Bank details, UPI and invoice payment assets</span></div><div class="panelbody"><p class="invoiceCentreIntro">Manage payment and bank information together. These details are used for invoice payment instructions and do not initiate transfers automatically.</p><div class="paymentSettingsPanels"></div></div>`;
      form.insertBefore(paymentHub,insertBefore||null);
      paymentPanels.forEach(panel=>paymentHub.querySelector('.paymentSettingsPanels').appendChild(panel));
    }
  }
  const renderBeforeInvoiceCentre=render;
  render=function(){renderBeforeInvoiceCentre();groupInvoiceControls()};
  render();
})();
