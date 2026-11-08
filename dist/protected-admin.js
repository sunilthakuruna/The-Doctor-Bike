function isProtectedGarageAdmin(user){return !!user&&user.id==='primary-admin'}
(()=>{
 const oldDelete=deleteRecord;
 deleteRecord=function(key,id){if(key==='users'&&isProtectedGarageAdmin(find('users',id)))return toast('This administrator account cannot be deleted.');return oldDelete.apply(this,arguments)};
 const oldActions=actions;
 actions=function(key,id,extra=''){
  let html=oldActions(key,id,extra);
  if(key==='users'&&isProtectedGarageAdmin(find('users',id)))html=html.replace(/<button\b(?=[^>]*data-delete="users\|)[^>]*>/g,tag=>tag.replace(/>$/, ' disabled aria-disabled="true" title="The primary administrator cannot be deleted">'));
  return html;
 };
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-delete]');if(!button)return;
  const [key,id]=button.dataset.delete.split('|');
  if(key==='users'&&isProtectedGarageAdmin(find('users',id))){event.preventDefault();event.stopImmediatePropagation();toast('This administrator account cannot be deleted.')}
 },true);
})();
