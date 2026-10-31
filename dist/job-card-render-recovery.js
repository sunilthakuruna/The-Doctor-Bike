/* Keep a startup rendering error visible instead of leaving the work area blank. */
const renderBeforeJobCardRecovery=render;
render=function(){
  try{return renderBeforeJobCardRecovery()}
  catch(error){
    console.error('Prototype page render failed',error);
    const content=document.querySelector('#content');
    if(!content)throw error;
    if(page==='jobs')content.innerHTML='<section class="panel" role="alert"><div class="panelhead"><h2>Job Cards could not load</h2></div><div class="panelbody"><p>Your saved records have been kept. Reload this page to try again. If the problem continues, download a backup from Settings before making changes.</p><button type="button" class="btn secondary" id="retryJobCardRender">Reload Job Cards</button></div></section>';
    else content.innerHTML='<section class="panel" role="alert"><div class="panelhead"><h2>This page could not load</h2></div><div class="panelbody"><p>Your saved records have been kept. Reload the page to try again.</p></div></section>';
    const panel=content.querySelector('.panelbody');
    if(panel){const details=document.createElement('details');details.style.marginTop='12px';const summary=document.createElement('summary');summary.textContent='Technical details';const detail=document.createElement('pre');detail.style.whiteSpace='pre-wrap';detail.style.fontSize='12px';detail.style.color='#64748b';detail.textContent=String(error&&error.message||error||'Unknown render error');details.append(summary,detail);panel.appendChild(details)}
    document.querySelector('#retryJobCardRender')?.addEventListener('click',()=>location.reload());
    return false;
  }
};
render();