/* Import/export safe, structured A4/A5 invoice design packages. Live invoice data remains application-controlled. */
(function(){
  const supportedPapers={A4:{width:210,height:297,label:'A4 (210 × 297 mm)'},A5:{width:148,height:210,label:'A5 (148 × 210 mm)'}};
  const clone=value=>JSON.parse(JSON.stringify(value));
  function templatePaper(template){
    return Object.entries(supportedPapers).find(([,paper])=>Math.abs(Number(template?.layout?.width)-paper.width)<.2&&Math.abs(Number(template?.layout?.height)-paper.height)<.2)?.[0]||null;
  }
  function packageFor(template){
    const paper=templatePaper(template);
    if(!paper)throw Error('Only A4 or A5 regular invoice templates can be exported.');
    return {format:'BIKE_DOCTOR_INVOICE_TEMPLATE',version:1,paper,createdAt:new Date().toISOString(),template:clone(template)};
  }
  function importTemplatePackage(raw,setDefault){
    if(!raw||raw.format!=='BIKE_DOCTOR_INVOICE_TEMPLATE'||raw.version!==1||!raw.template)throw Error('Choose a BIKE DOCTOR invoice template JSON file.');
    if(!supportedPapers[raw.paper])throw Error('This template is not A4 or A5.');
    const next=clone(raw.template),paper=supportedPapers[raw.paper];
    if(next.mode!=='regular')throw Error('Only A4 or A5 invoice templates can be imported here.');
    next.id='';next.layout={...next.layout,width:paper.width,height:paper.height,enabled:true};
    next.name=String(next.name||'Imported Invoice Template').trim().slice(0,70)+' ('+raw.paper+')';
    const saved=saveInvoiceTemplate(cleanTemplate(next),setDefault);
    if(!saved)throw Error('The template could not be saved in this browser.');
    audit('Invoice Template',`${saved.name} imported as ${raw.paper} design`);save();
    return saved;
  }
  function templateLibrary(){
    const templates=(db.invoiceTemplates||[]).filter(template=>template.mode==='regular');
    return `<section class="panel invoiceTemplateLibrary"><div class="panelhead"><h2>Invoice Template Library — A4 / A5</h2></div><div class="panelbody"><p>Upload a prepared <strong>BIKE DOCTOR template JSON</strong> file for A4 or A5. Its design is applied to live invoices while customer, vehicle, GST, services, parts and totals remain accurate and automatic.</p><div class="formgrid"><label class="field"><span>UPLOAD A4 / A5 TEMPLATE FILE</span><input id="invoiceTemplatePackageFile" type="file" accept="application/json,.json"></label><label class="customToggle" style="align-self:end"><input id="templateImportDefault" type="checkbox" checked> Set imported template as the default invoice design</label></div><div class="toolbar"><button type="button" class="btn" id="importInvoiceTemplatePackage">Upload Template</button><button type="button" class="btn secondary" id="downloadA4TemplateExample">Download A4 Template Example</button><button type="button" class="btn secondary" id="downloadA5TemplateExample">Download A5 Template Example</button></div><p class="notice" style="margin-top:12px">For safety, PDF, Word and image files are not accepted as live templates. Use the downloaded example or an exported BIKE DOCTOR template file, then upload the JSON design package.</p>${templates.length?`<div class="formgrid" style="margin-top:14px"><label class="field"><span>SAVED A4 / A5 TEMPLATE</span><select id="savedInvoiceTemplatePackage">${opts(templates.map(template=>({value:template.id,label:`${template.name} · ${templatePaper(template)||'Custom'}`})),templates[0].id)}</select></label></div><div class="toolbar"><button type="button" class="btn secondary small" id="exportInvoiceTemplatePackage">Download Selected Template</button><button type="button" class="btn secondary small" id="editInvoiceTemplatePackage">Edit Selected Template</button></div>`:'<p style="color:#64748b">No saved A4/A5 templates yet. Create one with the Invoice Template Designer or upload a prepared package.</p>'}</div></section>`;
  }
  function example(paperId){
    const template=defaultTemplate('regular'),paper=supportedPapers[paperId];
    template.name=`Standard ${paperId} Invoice Template`;template.layout={...template.layout,width:paper.width,height:paper.height,enabled:true};
    return packageFor(cleanTemplate(template));
  }
  const settingsBeforeTemplateUpload=settingsPage;
  settingsPage=function(){return settingsBeforeTemplateUpload()+templateLibrary()};
  const renderBeforeTemplateUpload=render;
  render=function(){
    renderBeforeTemplateUpload();
    if(page!=='settings')return;
    $('#importInvoiceTemplatePackage')?.addEventListener('click',async()=>{
      const file=$('#invoiceTemplatePackageFile')?.files?.[0];
      if(!file)return toast('Choose an A4 or A5 BIKE DOCTOR template JSON file first.');
      if(file.size>2*1024*1024)return toast('Template file must be 2 MB or smaller.');
      try{const saved=importTemplatePackage(JSON.parse(await file.text()),!!$('#templateImportDefault')?.checked);toast(`${saved.name} uploaded and saved.`);render()}catch(error){toast('Template upload rejected: '+error.message)}
    });
    $('#downloadA4TemplateExample')?.addEventListener('click',()=>download(JSON.stringify(example('A4'),null,2),'BIKE-DOCTOR-A4-template-example.json','application/json'));
    $('#downloadA5TemplateExample')?.addEventListener('click',()=>download(JSON.stringify(example('A5'),null,2),'BIKE-DOCTOR-A5-template-example.json','application/json'));
    $('#exportInvoiceTemplatePackage')?.addEventListener('click',()=>{
      try{const template=(db.invoiceTemplates||[]).find(item=>item.id===$('#savedInvoiceTemplatePackage')?.value);if(!template)throw Error('Select a saved template.');download(JSON.stringify(packageFor(template),null,2),`${template.name.replace(/[^a-z0-9]+/gi,'-')}.json`,'application/json')}catch(error){toast(error.message)}
    });
    $('#editInvoiceTemplatePackage')?.addEventListener('click',()=>{const id=$('#savedInvoiceTemplatePackage')?.value;if(id)openInvoiceTemplateDesigner('regular',id)});
  };
  render();
})();
