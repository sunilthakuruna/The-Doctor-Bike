/* Reliable select-all behaviour for the module permission matrix. */
(function(){
  function setPermissionColumn(form,permission,checked){
    for(const item of form.querySelectorAll(`[data-permission="${permission}"]`))item.checked=checked;
    const header=form.querySelector(`[data-permission-all="${permission}"]`);if(header)header.checked=checked;
  }
  document.addEventListener('change',event=>{
    const toggle=event.target.closest('[data-permission-all]');
    if(!toggle)return;
    const form=toggle.closest('form');if(!form)return;
    setPermissionColumn(form,toggle.dataset.permissionAll,toggle.checked);
  },true);
  const renderBeforePermissionControls=render;
  render=function(){
    renderBeforePermissionControls();
    if(page!=='users')return;
  };
  const editUserBeforePermissionControls=editRecord;
  editRecord=function(key,id,initial={}){
    editUserBeforePermissionControls(key,id,initial);
    if(key!=='users')return;
    const form=$('#recordForm'),matrix=form?.querySelector('.permissionTable');
    if(!form||!matrix||form.querySelector('.modulePermissionQuickControls'))return;
    const controls=document.createElement('div');controls.className='modulePermissionQuickControls';
    controls.innerHTML='<strong>Module permission shortcuts</strong><button type="button" class="btn small" data-module-permission-grant>Grant All Module Rights</button><button type="button" class="btn secondary small" data-module-permission-clear>Clear All Module Rights</button>';
    matrix.closest('.tablewrap').insertAdjacentElement('beforebegin',controls);
    controls.querySelector('[data-module-permission-grant]').onclick=()=>{for(const permission of ['read','write','edit','delete'])setPermissionColumn(form,permission,true)};
    controls.querySelector('[data-module-permission-clear]').onclick=()=>{for(const permission of ['read','write','edit','delete'])setPermissionColumn(form,permission,false)};
  };
})();
