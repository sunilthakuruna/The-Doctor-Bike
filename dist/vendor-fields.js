/* Reuse the purchase-style vendor selector in every applicable form. */
(function(){
  function enhanceVendorFields(){
    const fields=[...document.querySelectorAll('#modalBody select[name="preferredVendor"],#modalBody select[name="godown_preferredVendor"]')];
    for(const select of fields){
      if(select.dataset.vendorEnhanced)return;
      select.dataset.vendorEnhanced='1';
      const wrap=document.createElement('div');wrap.className='vendorFieldControls';wrap.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
      select.parentNode.insertBefore(wrap,select);wrap.append(select);
      const add=document.createElement('button');add.type='button';add.className='btn secondary small';add.textContent='+ Add Custom Vendor';add.setAttribute('aria-label','Add Custom Vendor');wrap.append(add);
      const custom=document.createElement('div');custom.className='customVendorInput';custom.hidden=true;custom.style.cssText='display:flex;gap:6px;align-items:center;flex-basis:100%;margin-top:4px';
      const input=document.createElement('input');input.type='text';input.maxLength=120;input.placeholder='Enter vendor name';input.setAttribute('aria-label','New vendor name');
      const use=document.createElement('button');use.type='button';use.className='btn small';use.textContent='Use Vendor';custom.append(input,use);wrap.append(custom);
      add.onclick=()=>{custom.hidden=false;input.focus()};
      use.onclick=()=>{const value=input.value.trim();if(!value){input.focus();return}let option=[...select.options].find(o=>o.value.toLocaleLowerCase()===value.toLocaleLowerCase());if(!option){option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)}if(!db.lists.Vendors)db.lists.Vendors=[];if(!db.lists.Vendors.some(v=>String(v).toLocaleLowerCase()===value.toLocaleLowerCase())){db.lists.Vendors.push(value);save('Vendor added to Vendor List')}select.value=option.value;custom.hidden=true;select.dispatchEvent(new Event('change',{bubbles:true}))};
    }
  }
  const previousOpenModal=openModal;
  openModal=function(title,html){const result=previousOpenModal.apply(this,arguments);setTimeout(enhanceVendorFields,0);return result};
  document.addEventListener('click',()=>setTimeout(enhanceVendorFields,0),true);
})();
