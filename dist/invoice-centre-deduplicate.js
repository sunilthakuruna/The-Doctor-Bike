/* One clear route for each invoice action inside Invoice Centre. */
(function(){
  function heading(panel){return panel.querySelector('.panelhead h2,h2,h3')?.textContent.trim()||''}
  function removeDuplicateInvoiceControls(){
    if(page!=='settings')return;
    const centre=$('.invoiceCentre');if(!centre)return;
    Array.from(centre.querySelectorAll('.panel')).forEach(panel=>{
      const title=heading(panel);
      /* Template Designer has a richer replacement for the legacy global layout editor. */
      if(title==='Custom Invoice Layout Designer'||title==='Print Preview')panel.remove();
      if(title==='Invoice Template Designer'){
        panel.querySelectorAll('.listoption').forEach(row=>row.remove());
        const description=panel.querySelector('.panelbody > p');
        if(description)description.textContent='Create a new invoice design here. Use the Invoice Template Library below to upload, download, select or edit saved A4/A5 templates.';
      }
    });
  }
  const renderBeforeInvoiceCentreDeduplicate=render;
  render=function(){renderBeforeInvoiceCentreDeduplicate();removeDuplicateInvoiceControls()};
  render();
})();
