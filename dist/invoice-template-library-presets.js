/* Ready-made A4/A5 reference designs. They never replace the user's chosen default. */
(function(){
  const papers={A4:{width:210,height:297},A5:{width:148,height:210}};
  const presets=[
    {id:'TPL-PRESET-A4-CLASSIC',name:'Classic Professional A4',paper:'A4',accent:'#1d4ed8',heading:'TAX INVOICE',footerNote:'Thank you for choosing our service.'},
    {id:'TPL-PRESET-A4-COMPACT',name:'Compact Workshop A4',paper:'A4',accent:'#0f766e',heading:'VEHICLE SERVICE INVOICE',footerNote:'Please keep this invoice for your service records.',hidden:['bank']},
    {id:'TPL-PRESET-A5-SIMPLE',name:'Simple Service A5',paper:'A5',accent:'#7c3aed',heading:'SERVICE INVOICE',footerNote:'Thank you. Visit again.',hidden:['bank']},
    {id:'TPL-PRESET-A5-MINIMAL',name:'Minimal Counter A5',paper:'A5',accent:'#b45309',heading:'INVOICE',footerNote:'Goods once sold are subject to the stated terms.',hidden:['bank','payment']}
  ];
  let added=0;db.invoiceTemplates=db.invoiceTemplates||[];
  for(const preset of presets){
    if(db.invoiceTemplates.some(template=>template.id===preset.id))continue;
    const paper=papers[preset.paper],template=defaultTemplate('regular');
    Object.assign(template,preset,{mode:'regular',layout:{...template.layout,width:paper.width,height:paper.height,enabled:true}});
    db.invoiceTemplates.push(cleanTemplate(template));added++;
  }
  if(added){
    audit('Invoice Template Library',`${added} A4/A5 reference templates added`);
    save();
  }
  /* The settings screen can render before this final library script runs. Repaint it immediately in both new and existing workspaces. */
  setTimeout(()=>render(),0);
})();
