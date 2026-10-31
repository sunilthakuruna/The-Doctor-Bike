/* Prevent duplicate spare-part codes and names, regardless of letter case or extra spaces. */
(function(){
  const normalName=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-IN');
  const normalCode=value=>String(value||'').trim().replace(/\s+/g,'').toLocaleUpperCase('en-IN');
  function duplicateMessage(name,code,recordId){
    const sameCode=(db.parts||[]).find(part=>part.id!==recordId&&normalCode(part.id)===normalCode(code));
    if(sameCode)return `Part code “${String(code).trim()}” is already used by ${sameCode.name}. Use a different part code.`;
    const sameName=(db.parts||[]).find(part=>part.id!==recordId&&normalName(part.name)===normalName(name));
    if(sameName)return `Part name “${String(name).trim()}” already exists as ${sameName.id}. Names must be unique even when capital letters differ.`;
    return '';
  }
  function validatePartForm(form,recordId){
    const name=form.elements.name?.value,code=form.elements.id?.value;
    if(form.elements.id)form.elements.id.value=normalCode(code);
    return duplicateMessage(name,form.elements.id?.value,recordId);
  }
  const editBeforePartIdentityValidation=editRecord;
  editRecord=function(key,id,initial={}){
    editBeforePartIdentityValidation(key,id,initial);
    if(key!=='parts')return;
    const form=$('#recordForm');if(!form)return;
    form.addEventListener('submit',event=>{const issue=validatePartForm(form,id);if(!issue)return;event.preventDefault();event.stopImmediatePropagation();toast(issue)},true);
    const code=form.elements.id;if(code&&!code.readOnly)code.addEventListener('input',()=>{const start=code.selectionStart;code.value=normalCode(code.value);code.setSelectionRange(start,start)});
  };
  if(typeof commitGodownOpening==='function'){
    const commitBeforePartIdentityValidation=commitGodownOpening;
    commitGodownOpening=function(values,partId){
      if(values.godown_id!==undefined)values.godown_id=normalCode(values.godown_id);
      const issue=duplicateMessage(values.godown_name,values.godown_id,partId);
      if(issue)throw Error(issue);
      return commitBeforePartIdentityValidation(values,partId);
    };
  }
})();
