/* Label related settings areas for the compact grouped presentation. */
const renderBeforeBusinessSettingsCompact=render;
render=function(){
  renderBeforeBusinessSettingsCompact();
  if(page!=='settings')return;
  for(const panel of $$('#content .panel')){
    const heading=panel.querySelector('.panelhead h2')?.textContent.trim()||'';
    if(/invoice|logo|layout|template/i.test(heading))panel.dataset.settingsCategory='invoice';
    if(/bank|payment|upi/i.test(heading))panel.dataset.settingsCategory='payment';
  }
};
render();
