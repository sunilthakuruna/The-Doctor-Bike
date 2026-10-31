/* Keep the invoice logo control without exposing demo-data management actions. */
const settingsBeforeGarageLogoOnly=settingsPage;
settingsPage=function(){
  let html=settingsBeforeGarageLogoOnly();
  html=html.replace(/<section class="panel"><div class="panelhead"><h2>(?:(?!<\/h2>)[\s\S])*?Imported Demo Business Records[\s\S]*?<\/section>/,'');
  return html.replace(/(<p style="text-align:center;color:#94a3b8;font-size:11px">)Imported demo logo · replace it with your own logo when ready(<\/p>)/,`<label class="field" style="margin:14px auto 8px;max-width:360px"><span>GARAGE LOGO FOR INVOICES (PNG / JPEG / WEBP, MAX 2 MB)</span><input type="file" id="logoFile" accept="image/png,image/jpeg,image/webp" capture="environment"></label>$1Current garage logo preview$2<button type="button" class="btn danger small" id="removeGarageLogo">Remove Logo</button>`);
};
const settingsBeforeRestorePointsRemoval=settingsPage;
settingsPage=function(){
  return settingsBeforeRestorePointsRemoval().replace(/<section class="panel"[^>]*><div class="panelhead"><h2>(?:(?!<\/h2>)[\s\S])*?Restore Points[\s\S]*?<\/section>/,'');
};
document.addEventListener('change',event=>{
  const input=event.target;
  if(input?.id!=='logoFile')return;
  event.stopImmediatePropagation();
  const file=input.files?.[0];
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024)return toast('Choose a PNG, JPEG or WebP logo up to 2 MB.');
  const reader=new FileReader();
  reader.onload=()=>{
    db.settings.logo=reader.result;
    audit('Update','Garage logo changed');
    if(save('Logo saved'))render();
  };
  reader.readAsDataURL(file);
},true);
document.addEventListener('click',event=>{
  if(event.target?.id!=='removeGarageLogo')return;
  if(!db.settings.logo)return toast('No garage logo is uploaded.');
  const previous=db.settings.logo;db.settings.logo='';
  if(save('Garage logo removed')===false)db.settings.logo=previous;else render();
});
const renderBeforeGarageLogoMove=render;
render=function(){
  renderBeforeGarageLogoMove();
  if(page!=='settings')return;
  const panels=[...document.querySelectorAll('#settingsForm .panel')];
  const profile=panels.find(panel=>panel.querySelector('.panelhead h2')?.textContent.includes('Garage Profile'));
  const source=panels.find(panel=>panel.querySelector('#logoFile'));
  if(!profile||!source||source===profile)return;
  const image=source.querySelector('.garageLogo');
  const input=source.querySelector('#logoFile')?.closest('label');
  const note=[...source.querySelectorAll('p')].find(node=>node.textContent.includes('Current garage logo preview'));
  const remove=source.querySelector('#removeGarageLogo');
  if(!image&&!input)return;
  const group=document.createElement('div');
  group.className='garageLogoSettings';
  group.innerHTML='<h3>Garage Logo for Invoices</h3><p class="settingsHint">This logo is printed on A4, A5 and thermal invoices.</p>';
  if(image)group.appendChild(image);
  if(note)group.appendChild(note);
  if(input)group.appendChild(input);
  if(remove)group.appendChild(remove);
  profile.querySelector('.panelbody')?.appendChild(group);
};
render();
