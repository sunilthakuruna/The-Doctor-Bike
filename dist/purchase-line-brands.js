/* Allow the same spare part code to carry a different brand on each purchase line. */
(function(){
  function enhance(){
    if(jobDraft?.key!=='purchases')return;
    document.querySelectorAll('.purchaseItemsTable tbody tr').forEach((row,index)=>{
      if(row.querySelector('[data-purchase-brand]'))return;
      const line=jobDraft.record.partLines[index];if(!line)return;
      const code=row.querySelector('[data-purchase-lookup$="|code"]');
      if(!code)return;
      const cell=document.createElement('td');
      const input=document.createElement('input');input.type='text';input.placeholder='Brand';input.title='Brand for this purchase line';input.setAttribute('aria-label','Brand for part '+(index+1));input.dataset.purchaseBrand=index;input.value=line.brand||find('parts',line.part)?.brand||'';
      cell.append(input);code.closest('td').after(cell);
      input.addEventListener('input',()=>{line.brand=input.value.trim()});
    });
    const head=document.querySelector('.purchaseItemsTable thead tr');
    if(head&&!head.querySelector('[data-purchase-brand-heading]')){const th=document.createElement('th');th.textContent='BRAND';th.dataset.purchaseBrandHeading='1';head.children[1]?.after(th)}
  }
  document.addEventListener('click',()=>setTimeout(enhance,0),true);
  document.addEventListener('input',()=>setTimeout(enhance,0),true);
  const oldRender=render;render=function(){const out=oldRender.apply(this,arguments);setTimeout(enhance,0);return out};
})();
