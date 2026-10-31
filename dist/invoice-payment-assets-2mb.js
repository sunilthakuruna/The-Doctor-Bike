/* Invoice QR and signature images have their own 2 MB limit. */
function readInvoicePaymentImage(file){
  if(!file||file.size>2*1024*1024)throw Error('Choose a PNG, JPG or WebP image up to 2 MB.');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPG or WebP image.');
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>validInvoiceImage(reader.result)?resolve(reader.result):reject(Error('Choose a valid PNG, JPG or WebP image.'));reader.onerror=()=>reject(Error('Unable to read the selected image.'));reader.readAsDataURL(file)});
}
const settingsBeforeInvoicePaymentAssets2mb=settingsPage;
settingsPage=function(){return settingsBeforeInvoicePaymentAssets2mb().replaceAll('Upload PNG / JPG / WebP (maximum 1 MB)','Upload PNG / JPG / WebP (maximum 2 MB)')};
const renderBeforeInvoicePaymentAssets2mb=render;
render=function(){
  renderBeforeInvoicePaymentAssets2mb();
  if(page!=='settings')return;
  for(const input of $$('[data-invoice-asset]'))input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    input.disabled=true;
    try{
      const key=input.dataset.invoiceAsset,before=db.settings[key],data=await readInvoicePaymentImage(file);
      db.settings[key]=data;
      if(save('Invoice image saved')===false){db.settings[key]=before;return;}
      render();
    }catch(error){toast(error.message)}finally{input.disabled=false}
  };
  for(const button of $$('[data-remove-invoice-asset]'))button.onclick=()=>{
    const key=button.dataset.removeInvoiceAsset,before=db.settings[key];
    delete db.settings[key];
    if(save('Invoice image removed')===false){db.settings[key]=before;return;}
    render();
  };
};
render();
