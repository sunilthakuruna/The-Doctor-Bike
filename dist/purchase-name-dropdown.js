/* Keep purchase part suggestions visible above the horizontally scrolling table. */
(function(){
  let input=null;
  const menu=document.createElement('div');
  menu.id='purchasePartNameMenu';
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label','Saved spare parts');
  menu.hidden=true;
  document.body.append(menu);

  function close(){menu.hidden=true;if(input?.isConnected)input.setAttribute('aria-expanded','false');input=null}
  function position(){
    if(!input?.isConnected){close();return}
    const rect=input.getBoundingClientRect();
    if(rect.bottom<0||rect.top>innerHeight){close();return}
    const width=Math.min(Math.max(rect.width,340),innerWidth-20);
    menu.style.width=width+'px';
    menu.style.left=Math.max(10,Math.min(rect.left,innerWidth-width-10))+'px';
    const height=Math.min(260,Math.max(100,innerHeight-20));
    menu.style.maxHeight=height+'px';
    menu.style.top=(rect.bottom+height+8<=innerHeight?rect.bottom+4:Math.max(8,rect.top-height-4))+'px';
  }
  function show(target){
    if(jobDraft?.key!=='purchases')return;
    input=target;
    input.removeAttribute('list');
    input.setAttribute('role','combobox');
    input.setAttribute('aria-controls',menu.id);
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-expanded','true');
    const query=input.value.trim().toLocaleLowerCase();
    const selected=jobDraft.record.partLines[Number(input.dataset.purchaseLookup.split('|')[0])];
    const terms=query&&query!==String(find('parts',selected?.part)?.name||'').toLocaleLowerCase()?query:'';
    const matches=(db.parts||[]).filter(part=>[part.name,part.id,part.brand,part.hsn].some(value=>String(value||'').toLocaleLowerCase().includes(terms))).slice(0,60);
    menu.replaceChildren();
    if(!matches.length){const empty=document.createElement('div');empty.className='purchasePartNameEmpty';empty.textContent='No matching saved parts';menu.append(empty)}
    for(const part of matches){
      const option=document.createElement('button');option.type='button';option.setAttribute('role','option');option.className='purchasePartNameOption';
      const title=document.createElement('strong');title.textContent=part.name;
      const detail=document.createElement('small');detail.textContent=[part.id,part.brand,part.hsn?'HSN '+part.hsn:''].filter(Boolean).join(' · ');
      option.append(title,detail);
      option.addEventListener('pointerdown',event=>event.preventDefault());
      option.addEventListener('click',()=>{
        if(!input?.isConnected||jobDraft?.key!=='purchases')return close();
        const index=Number(input.dataset.purchaseLookup.split('|')[0]);
        const line=jobDraft.record.partLines[index];if(!line)return close();
        jobDraft.record.partLines[index]=purchaseSelectedPart(line,part);
        syncPurchaseItemInputs(index);
        updateBillTotals();
        const chosen=input;close();chosen.focus();
      });
      menu.append(option);
    }
    menu.hidden=false;position();
  }
  document.addEventListener('focusin',event=>{const target=event.target;if(target.matches?.('#billForm [data-purchase-lookup$="|name"]'))show(target);else if(!menu.contains(target))close()});
  document.addEventListener('input',event=>{if(event.target===input)show(input)});
  document.addEventListener('keydown',event=>{
    if(event.target!==input||menu.hidden)return;
    if(event.key==='Escape'){event.preventDefault();close()}
    else if(event.key==='ArrowDown'){event.preventDefault();menu.querySelector('button')?.focus()}
  });
  document.addEventListener('pointerdown',event=>{if(input&&!menu.contains(event.target)&&event.target!==input)close()});
  document.addEventListener('scroll',()=>{if(input&&!menu.hidden)position()},true);
  window.addEventListener('resize',()=>{if(input&&!menu.hidden)position()});
})();
