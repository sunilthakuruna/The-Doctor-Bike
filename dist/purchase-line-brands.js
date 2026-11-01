/* Allow the same spare part code to carry a different brand on each purchase line. */
(function(){
  function enhance(){
    if(jobDraft?.key!=='purchases')return;
    document.querySelectorAll('.purchaseItemsTable tbody tr').forEach((row,index)=>{
      if(row.querySelector('[data-purchase-brand]'))return;
      const line=jobDraft.record.partLines[index];if(!line)return;
      const name=row.querySelector('[data-purchase-lookup$="|name"]');
      if(!name)return;
      const cell=document.createElement('td');
      const input=document.createElement('input');input.type='text';input.placeholder='Brand';input.title='Brand for this purchase line';input.setAttribute('aria-label','Brand for part '+(index+1));input.dataset.purchaseBrand=index;input.value=line.brand||find('parts',line.part)?.brand||'';
      cell.append(input);name.closest('td').after(cell);
      input.addEventListener('input',()=>{line.brand=input.value.trim()});
    });
    const head=document.querySelector('.purchaseItemsTable thead tr');
    if(head&&!head.querySelector('[data-purchase-brand-heading]')){const th=document.createElement('th');th.textContent='BRAND';th.dataset.purchaseBrandHeading='1';head.children[2]?.after(th)}
    const columns=document.querySelector('.purchaseItemsTable colgroup');
    if(columns&&!columns.querySelector('[data-purchase-brand-column]')){const col=document.createElement('col');col.dataset.purchaseBrandColumn='1';columns.children[2]?.after(col)}
    const empty=document.querySelector('.purchaseItemsTable tbody tr td[colspan]');if(empty)empty.colSpan=15;
  }
  const oldLineRender=lineRender;
  lineRender=function(){const out=oldLineRender.apply(this,arguments);enhance();return out};
  const oldRender=render;render=function(){const out=oldRender.apply(this,arguments);setTimeout(enhance,0);return out};
})();
