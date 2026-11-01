/* Lower-page operating hints for stock flows across inventory modules. */
(function(){
  const guides={
    purchases:{title:'Purchase Entry — Stock Flow',steps:[['Choose destination','Receive into Main Stock for immediate job-card or counter-sale availability. Receive into Godown for storage; transfer it to Main Stock when needed.'],['Enter each bill rate','Quantity, purchase rate and GST stay with this supplier bill. The receipt increases only its selected stock location.'],['Master purchase-price reference','It refreshes from the receipt only when combined Main Stock and Godown stock was zero before the receipt. Otherwise the existing reference remains.']]},
    godown:{title:'Godown Stock — Stock Flow',steps:[['Receive','Choose Godown in a Purchase Entry. The quantity is stored in Godown.'],['Transfer','Transfer stock from Godown to Main Stock when needed. Godown goes down and Main Stock goes up by the same quantity.'],['Use and review','Job Cards and Spare Parts Sales use Main Stock. Sales / Used means stock consumed by a job or sale, not stock transferred from Godown.']]},
    jobs:{title:'Job Card — Spare Parts Flow',steps:[['Select parts','Job Cards draw spare parts from Main Stock. Godown quantity is not available directly in a job card.'],['Transfer first','If Main Stock is short, transfer the required quantity from Godown before adding it to the job.'],['Save the job','Saving the job issues the entered quantity from Main Stock. The part’s selling rate, discount and GST follow the job-card line.']]},
    sales:{title:'Spare Parts Sale — Stock Flow',steps:[['Check availability','Counter sales use Main Stock. Godown stock must be transferred to Main Stock before it can be sold.'],['Enter sale quantities','The sale line retains its sale rate, discount and GST for that transaction.'],['Save the sale','Saving the sale reduces Main Stock by the sold quantity. Check the movement report for part-wise history.']]}
  };
  const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function renderGuide(){
    const target=guides[page],content=document.getElementById('content');
    if(!target||!content||document.getElementById('stockFlowGuide'))return;
    const steps=target.steps.map(([heading,body])=>'<article><h3>'+escapeText(heading)+'</h3><p>'+escapeText(body)+'</p></article>').join('');
    content.insertAdjacentHTML('beforeend','<section class="stockFlowGuide panel" id="stockFlowGuide"><div class="panelhead"><h2>'+escapeText(target.title)+'</h2></div><div class="panelbody"><div class="stockFlowGuideGrid">'+steps+'</div></div></section>');
  }
  const renderBeforeStockFlowGuides=render;
  render=function(){const result=renderBeforeStockFlowGuides.apply(this,arguments);renderGuide();return result};
  if(['purchases','godown','jobs','sales'].includes(page))renderGuide();
})();
