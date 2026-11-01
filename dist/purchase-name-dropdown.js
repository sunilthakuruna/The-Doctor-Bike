/* Search saved parts in a menu that is not clipped by the purchase table. */
(function(){
  let activeInput=null;
  const menu=document.createElement('div');
  menu.id='purchasePartNameMenu';
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label','Saved spare parts');
  menu.hidden=true;
  const search=document.createElement('input');
  search.type='search';
  search.placeholder='Search part name, code, brand...';
  search.setAttribute('aria-label','Search saved spare parts');
  search.className='purchasePartNameSearch';
  const results=document.createElement('div');
  menu.append(search,results);
  document.body.append(menu);

  function close(){menu.hidden=true;if(activeInput?.isConnected)activeInput.setAttribute('aria-expanded','false');activeInput=null}
  function position(){
    if(!activeInput?.isConnected){close();return}
    const rect=activeInput.getBoundingClientRect();
    if(rect.bottom<0||rect.top>innerHeight){close();return}
    const width=Math.min(Math.max(rect.width,420),innerWidth-20);
    menu.style.width=width+'px';
    menu.style.left=Math.max(10,Math.min(rect.left,innerWidth-width-10))+'px';
    const height=Math.min(300,Math.max(100,innerHeight-20));
    menu.style.maxHeight=height+'px';
    menu.style.top=(rect.bottom+height+8<=innerHeight?rect.bottom+4:Math.max(8,rect.top-height-4))+'px';
  }
  function choose(part){
    if(!activeInput?.isConnected||jobDraft?.key!=='purchases')return close();
    const index=Number(activeInput.dataset.purchaseLookup.split('|')[0]);
    const line=jobDraft.record.partLines[index];if(!line)return close();
    jobDraft.record.partLines[index]=purchaseSelectedPart(line,part);
    syncPurchaseItemInputs(index);
    updateBillTotals();
    const chosen=activeInput;close();chosen.focus();
  }
  function filter(query){
    const term=query.trim().toLocaleLowerCase();
    const matches=(db.parts||[]).filter(part=>[part.name,part.id,part.brand,part.hsn].some(value=>String(value||'').toLocaleLowerCase().includes(term))).slice(0,60);
    results.replaceChildren();
    if(!matches.length){const empty=document.createElement('div');empty.className='purchasePartNameEmpty';empty.textContent='No matching saved parts';results.append(empty)}
    for(const part of matches){
      const option=document.createElement('button');option.type='button';option.setAttribute('role','option');option.className='purchasePartNameOption';
      const title=document.createElement('strong');title.textContent=part.name;
      const detail=document.createElement('small');detail.textContent=[part.id,part.brand,part.hsn?'HSN '+part.hsn:''].filter(Boolean).join(' · ');
      option.append(title,detail);
      option.addEventListener('pointerdown',event=>event.preventDefault());
      option.addEventListener('click',()=>choose(part));
      results.append(option);
    }
  }
  function open(target){
    if(jobDraft?.key!=='purchases')return;
    activeInput=target;
    activeInput.removeAttribute('list');
    activeInput.setAttribute('role','combobox');
    activeInput.setAttribute('aria-controls',menu.id);
    activeInput.setAttribute('aria-autocomplete','list');
    activeInput.setAttribute('aria-expanded','true');
    const index=Number(activeInput.dataset.purchaseLookup.split('|')[0]);
    const saved=find('parts',jobDraft.record.partLines[index]?.part);
    const current=activeInput.value.trim();
    search.value='';
    filter(current&&current.toLocaleLowerCase()!==String(saved?.name||'').toLocaleLowerCase()?current:'');
    menu.hidden=false;position();
  }
  document.addEventListener('focusin',event=>{const target=event.target;if(target.matches?.('#billForm [data-purchase-lookup$="|name"]'))open(target);else if(!menu.contains(target))close()});
  document.addEventListener('input',event=>{if(event.target===activeInput)filter(activeInput.value);else if(event.target===search)filter(search.value)});
  document.addEventListener('keydown',event=>{
    if(menu.hidden)return;
    if(event.key==='Escape'&&(event.target===activeInput||menu.contains(event.target))){event.preventDefault();event.stopImmediatePropagation();const target=activeInput;close();target?.focus()}
    else if(event.key==='ArrowDown'&&event.target===activeInput){event.preventDefault();search.focus()}
    else if(event.key==='Enter'&&event.target===search){event.preventDefault();results.querySelector('button')?.click()}
  },true);
  document.addEventListener('pointerdown',event=>{if(activeInput&&!menu.contains(event.target)&&event.target!==activeInput)close()});
  document.addEventListener('scroll',()=>{if(activeInput&&!menu.hidden)position()},true);
  window.addEventListener('resize',()=>{if(activeInput&&!menu.hidden)position()});
})();
