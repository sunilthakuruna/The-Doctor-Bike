/* Reapply compact payment-tab density after every tab render. */
(function(){
  const renderBeforePaymentTabCompact=render;
  function applyPaymentTabCompact(){
    if(page!=='payments'||!['suppliers','history'].includes(tabState))return;
    const records=$('#content .paymentRecords');
    if(records)records.classList.add('paymentTabsCompact');
  }
  render=function(){renderBeforePaymentTabCompact();applyPaymentTabCompact()};
})();
