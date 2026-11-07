/* Presentation only; handlers, permissions and disabled states stay unchanged. */
function actionButtonKind(button){
 const label=[button.getAttribute('data-action'),button.getAttribute('title'),button.getAttribute('aria-label'),button.textContent].filter(Boolean).join(' ').toLowerCase();
 const attrs=Array.from(button.attributes||[],a=>a.name).join(' ');
 if(button.matches('[data-delete]')||/delete|remove|trash|purge|erase|reset.*(?:data|workspace|app)/.test(label))return 'danger';
 if(button.matches('[data-edit],[data-godown-edit]')||/\bedit\b|rename|modify/.test(label))return 'edit';
 if(/history|ledger|audit|statement/.test(label+' '+attrs))return 'history';
 if(/cancel|close|back|previous|next|reset|clear filter|sign out|logout|collapse/.test(label))return 'neutral';
 if(/whatsapp|message|send|remind/.test(label+' '+attrs))return 'message';
 if(/transfer|restore|receive stock/.test(label+' '+attrs))return 'warning';
 if(/export|download/.test(label+' '+attrs))return 'export';
 if(/save|submit|confirm|mark sent/.test(label)||button.type==='submit')return 'save';
 if(/\badd\b|\bnew\b|create|import|upload/.test(label))return 'add';
 if(button.classList.contains('danger'))return 'danger';
 if(button.classList.contains('success'))return 'save';
 return 'view';
}
(function(){
 function apply(root){
  const buttons=[...(root.matches?.('.btn')?[root]:[]),...root.querySelectorAll('.btn')];
  for(const button of buttons){
   if(!button.closest('#content,#modalBody')||button.matches('[data-item-discount],[data-attendance-status],[data-attendance-all]'))continue;
   const kind=actionButtonKind(button);
   if(button.dataset.actionColor!==kind)button.dataset.actionColor=kind;
  }
 }
 apply(document);
 new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='attributes'){apply(record.target);continue;}
   for(const node of record.addedNodes)if(node.nodeType===1)apply(node);
  }
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['title','aria-label','data-action']});
})();
