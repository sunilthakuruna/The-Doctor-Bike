/* Genuine/Aftermarket nomenclature without changing stock calculations. */
(function(){
  const basePartOptions=partOptions;
  partOptions=function(){return basePartOptions().map(option=>{const part=find('parts',option.value),type=part?.partType||'Genuine';return {...option,label:option.label+' — '+type}})};
  function addPartType(){
    if(page!=='parts')return;
    const form=document.querySelector('#recordForm');if(!form||form.querySelector('[name="partType"]'))return;
    const id=form.querySelector('[name="id"]')?.closest('label');if(!id)return;
    const label=document.createElement('label');label.className='field';label.innerHTML='<span>Part Type</span><select name="partType"><option value="Genuine">Genuine</option><option value="Aftermarket">Aftermarket</option></select>';
    id.after(label);const current=jobDraft?.record?.partType||'Genuine';label.querySelector('select').value=current;
  }
  function labelPartFields(){
    document.querySelectorAll('#purchasePartNames option,#purchasePartCodes option').forEach(option=>{
      const part=find('parts',option.value);if(!part)return;
      const type=part.partType||'Genuine';
      const base=option.getAttribute('data-base-label')||option.label||option.textContent;
      if(!option.dataset.baseLabel)option.dataset.baseLabel=base.replace(/\s+—\s+(Genuine|Aftermarket)$/i,'');
      option.label=option.dataset.baseLabel+' — '+type;option.textContent=option.dataset.baseLabel+' — '+type;
    });
  }
  function labelGodownRows(){
    if(page!=='godown')return;
    document.querySelectorAll('#content table tbody tr').forEach(row=>{
      const code=row.cells?.[0]?.textContent?.trim(),nameCell=row.cells?.[1];
      const part=find('parts',code);if(!part||!nameCell||nameCell.dataset.partTypeShown)return;
      nameCell.dataset.partTypeShown='1';nameCell.innerHTML=esc(part.name||nameCell.textContent.trim())+' <small class="partTypeBadge">'+esc(part.partType||'Genuine')+'</small>';
    });
  }
  const oldRender=render;render=function(){const out=oldRender.apply(this,arguments);setTimeout(()=>{addPartType();labelPartFields();labelGodownRows()},0);return out};
  document.addEventListener('click',()=>setTimeout(()=>{addPartType();labelPartFields();labelGodownRows()},0),true);
})();
