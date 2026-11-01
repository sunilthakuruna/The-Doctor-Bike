'use strict';
(function(){
  function addSidebarControl(){
    const sidebar=document.querySelector('#sidebar');
    if(!sidebar||sidebar.querySelector('[data-collapse-sidebar]'))return;
    const button=document.createElement('button');
    button.type='button';button.className='sidebarCollapseButton';button.dataset.collapseSidebar='1';
    button.innerHTML='<span aria-hidden="true">‹</span><span class="sidebarCollapseLabel">Collapse menu</span>';
    button.onclick=()=>{document.body.classList.toggle('navcollapsed');button.querySelector('span:last-child').textContent=document.body.classList.contains('navcollapsed')?'Expand menu':'Collapse menu';button.querySelector('span:first-child').textContent=document.body.classList.contains('navcollapsed')?'›':'‹'};
    sidebar.appendChild(button);
  }
  const originalRender=render;
  render=function(){originalRender();addSidebarControl()};
  addSidebarControl();
}());
