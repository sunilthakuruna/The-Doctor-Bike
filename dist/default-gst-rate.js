/* Business Settings default GST rate for new purchase and spare-part sale lines. */
(function(){
  const rates=[0,5,10,12,18,24,28];
  db.lists=db.lists||{};
  if(!Array.isArray(db.lists['GST Rates']))db.lists['GST Rates']=[...rates.map(String)];
  const managedRates=()=>[...new Set((db.lists['GST Rates']||[]).map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);
  const previousSettingsPage=settingsPage;
  settingsPage=function(){return previousSettingsPage.apply(this,arguments)};
  const previousRender=render;
  render=function(){
    const result=previousRender.apply(this,arguments);
    if(page==='settings'){
      const panel=document.querySelector('#settingsForm .panel:nth-child(2) .panelbody');
      if(panel&&!panel.querySelector('[name="defaultPurchaseGstRate"]'))panel.insertAdjacentHTML('afterbegin',`<label class="field"><span>Default Purchase GST Rate (%)</span><select name="defaultPurchaseGstRate">${managedRates().map(rate=>`<option value="${rate}" ${Number(db.settings.defaultPurchaseGstRate??db.settings.defaultGstRate??0)===rate?'selected':''}>${rate}%</option>`).join('')}</select><small>Applied to new Purchase Entries.</small></label><label class="field"><span>Default Selling GST Rate (%)</span><select name="defaultSellingGstRate">${managedRates().map(rate=>`<option value="${rate}" ${Number(db.settings.defaultSellingGstRate??db.settings.defaultGstRate??0)===rate?'selected':''}>${rate}%</option>`).join('')}</select><small>Applied to new Spare Parts Sales.</small></label>`);
    }
    return result;
  };
  const previousLineRender=lineRender;
  lineRender=function(){
    if(jobDraft&&!jobDraft.id&&['purchases','sales','jobs'].includes(jobDraft.key)){
      const rate=jobDraft.key==='purchases'?db.settings.defaultPurchaseGstRate??db.settings.defaultGstRate:db.settings.defaultSellingGstRate??db.settings.defaultGstRate;
      jobDraft.record.partLines.forEach(line=>{if(line.gst===0&&rate!=null)line.gst=Number(rate||0)});
    }
    const result=previousLineRender.apply(this,arguments);
    if(jobDraft?.key==='sales'||jobDraft?.key==='jobs')document.querySelectorAll('[data-partfield$="|gst"]').forEach(select=>{const current=select.value,values=managedRates();select.innerHTML=values.map(rate=>`<option value="${rate}" ${String(rate)===String(current)?'selected':''}>${rate}%</option>`).join('')});
    return result;
  };
})();
