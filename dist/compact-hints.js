/* Move explanatory copy only; never relocate controls, errors or record status. */
(()=>{
 const hints='.moduleCalculationHint,.reportCalculationHint,.profitOperatingNote,.profitCalculationHint,.gstCalculationHint,.cloudProvisionNote,.settingsHint,.list-edit-hint,.payrollRule,.partsStockGuide,.stockFlowGuide,[data-staff-salary-hint]';
 const advisory=/^(?:Hint:|Calculation hint:|Edit each service charge|Godown and main stock use|Service \/ Labour GST is selected|Existing vehicle\/customer details|Due dates are set per vehicle|AMC and service reminders are vehicle-specific|Automatic sync: Vehicle Make|Sync All saves every dropdown|Administrators manage server user accounts|Amounts are in INR\.)/i;
 function compact(root){
  if(!root||root.closest('.invoiceV2,.invoiceFormatControls'))return;
  let footer=root.querySelector(':scope > .compactModuleHints');
  const nodes=[...root.querySelectorAll(hints+',.notice')].filter(node=>{
   if(node.closest('.compactModuleHints,.partsStockGuide,.stockFlowGuide')!==null&&!node.matches('.partsStockGuide,.stockFlowGuide'))return false;
   if(node.closest('table,.invoiceV2,[role="alert"],[role="status"]')||node.querySelector('button,input,select,textarea,a,[role="alert"]'))return false;
   return node.matches(hints)||advisory.test(node.textContent.trim());
  });
  if(!nodes.length)return;
  if(!footer){footer=document.createElement('aside');footer.className='compactModuleHints';footer.setAttribute('aria-label','Helpful notes');root.appendChild(footer)}
  nodes.forEach(node=>{if(!footer.contains(node))footer.appendChild(node)});
 }
 function update(){
  compact(document.querySelector('#content'));
  document.querySelectorAll('#modalBody .formbody').forEach(compact);
 }
 const observer=new MutationObserver(update);
 observer.observe(document.querySelector('#content'),{childList:true,subtree:true});
 const modal=document.querySelector('#modalBody');if(modal)observer.observe(modal,{childList:true,subtree:true});
 update();
})();
