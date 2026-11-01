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
  function addAttendanceControl(){
    const view=document.querySelector('#attendanceDailyTabContent'),card=view?.querySelector('.attendanceControlCard');
    if(!card||card.querySelector('[data-attendance-density]'))return;
    const button=document.createElement('button');button.type='button';button.className='btn secondary small attendanceDensityButton';button.dataset.attendanceDensity='1';button.textContent='Compact controls';
    button.onclick=()=>{const compact=view.classList.toggle('attendanceCompact');button.textContent=compact?'Show full controls':'Compact controls'};
    card.querySelector('.attendanceSaveRow')?.appendChild(button);
  }
  const originalRender=render;
  render=function(){originalRender();addSidebarControl();addAttendanceControl()};
  addSidebarControl();addAttendanceControl();
}());
