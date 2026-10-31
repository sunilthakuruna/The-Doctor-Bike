/* Purchase supplier selector follows the demo: use known suppliers or add one while entering a purchase. */
const purchaseSupplierBillFormBeforeDropdown=billForm;
billForm=function(key,id,initial){
  const result=purchaseSupplierBillFormBeforeDropdown.apply(this,arguments);
  if(key!=='purchases')return result;
  const input=$('#billForm [name="supplier"]'),label=input?.closest('label.field');
  if(!input||!label)return result;
  const selected=input.value,known=[...(db.purchases||[]).map(p=>p.supplier),...(db.parts||[]).map(p=>p.preferredVendor),...(db.lists?.Vendors||[])];
  const suppliers=[...new Map(known.map(v=>String(v||'').trim()).filter(Boolean).map(v=>[v.toLocaleLowerCase(),v])).values()].sort((a,b)=>a.localeCompare(b));
  if(selected&&!suppliers.some(v=>v.toLocaleLowerCase()===selected.toLocaleLowerCase()))suppliers.unshift(selected);
  const select=document.createElement('select');select.name='supplier';select.required=true;select.setAttribute('aria-label','Supplier / Vendor');
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='-- Select Supplier --';select.append(placeholder);
  for(const supplier of suppliers){const option=document.createElement('option');option.value=supplier;option.textContent=supplier;select.append(option)}
  select.value=selected;
  const row=document.createElement('div');row.className='purchaseSupplierControls';row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';
  const add=document.createElement('button');add.type='button';add.className='btn secondary small';add.textContent='+ Add Custom Supplier';add.setAttribute('aria-label','Add Custom Supplier');
  const custom=document.createElement('div');custom.className='purchaseCustomSupplier';custom.hidden=true;custom.style.cssText='display:flex;gap:6px;align-items:center;margin-top:6px';
  const customInput=document.createElement('input');customInput.type='text';customInput.maxLength=120;customInput.placeholder='Enter supplier name';customInput.setAttribute('aria-label','New supplier name');
  const save=document.createElement('button');save.type='button';save.className='btn small';save.textContent='Use Supplier';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='btn secondary small';cancel.textContent='Cancel';
  custom.append(customInput,save,cancel);
  const wrapper=document.createElement('div');wrapper.append(row,custom);row.append(select,add);input.replaceWith(wrapper);
  add.onclick=()=>{custom.hidden=false;customInput.focus()};
  const useCustom=()=>{const value=customInput.value.trim();if(!value){customInput.focus();return}let option=[...select.options].find(o=>o.value.toLocaleLowerCase()===value.toLocaleLowerCase());if(!option){option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)}if(!db.lists.Vendors)db.lists.Vendors=[];if(!db.lists.Vendors.some(v=>String(v).toLocaleLowerCase()===value.toLocaleLowerCase())){db.lists.Vendors.push(value);save('Vendor added to Vendor List')}select.value=option.value;customInput.value='';custom.hidden=true;select.dispatchEvent(new Event('change',{bubbles:true}))};
  save.onclick=useCustom;customInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();useCustom()}if(e.key==='Escape'){custom.hidden=true;customInput.value='';add.focus()}};cancel.onclick=()=>{custom.hidden=true;customInput.value='';add.focus()};
  return result;
};
