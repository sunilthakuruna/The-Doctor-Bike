/* Manufacturer barcode selects an existing part through its normal picker. */
function barcodePartMatch(parts,code){
 const value=String(code||'').trim();
 if(!value)return {error:'Scan or enter a barcode first.'};
 const matches=parts.filter(part=>String(part.barcode||'').trim()===value);
 return matches.length===1?{part:matches[0]}:{error:matches.length?'This barcode is linked to multiple parts. Correct it in Spare Parts.':'Barcode not found. Link it in Spare Parts first.'};
}
function barcodeSelectEntryPart(part,draft,root){
 let index=(draft.record.partLines||[]).findIndex(line=>!line.part);
 if(index<0){
  const add=draft.key==='purchases'?root.querySelector('[data-purchase-add]'):root.querySelector('[data-action="addPart"]');
  if(!add)return 'Click Add Part first, then scan again.';
  add.click();index=draft.record.partLines.length-1;
 }
 const picker=draft.key==='purchases'?root.querySelector('[data-purchase-lookup="'+index+'|code"]'):root.querySelector('[data-line="part|'+index+'"]');
 if(!picker)return 'Part selection is unavailable. Use the existing dropdown.';
 picker.value=part.id;picker.dispatchEvent(new Event('change',{bubbles:true}));
 return '';
}
(()=>{
 const hsnField=schemas.parts.find(field=>field.key==='hsn');
 if(hsnField){hsnField.required=true;hsnField.label='HSN Code'}
 const nameIndex=schemas.parts.findIndex(field=>field.key==='name');
 schemas.parts.splice(nameIndex+1,0,{key:'barcode',label:'Manufacturer Barcode (Optional)'});
 document.addEventListener('submit',event=>{
  if(event.target.id!=='recordForm'||editing?.key!=='parts')return;
  const hsn=event.target.querySelector('[name="hsn"]');
  if(!hsn?.value.trim()){
   event.preventDefault();event.stopImmediatePropagation();toast('Enter the HSN code for this spare part.');hsn?.focus();return;
  }
  hsn.value=hsn.value.trim();
  const input=event.target.querySelector('[name="barcode"]'),code=input?.value.trim();
  if(code&&db.parts.some(part=>part.id!==editing.id&&String(part.barcode||'').trim()===code)){
   event.preventDefault();event.stopImmediatePropagation();toast('This manufacturer barcode is already assigned to another part.');input.focus();
  }
 },true);
 if(typeof commitGodownOpening==='function'){
  const commitBeforeHsn=commitGodownOpening;
  commitGodownOpening=function(values,partId){
   const hsn=String(values.godown_hsn??find('parts',partId)?.hsn??'').trim();
   if(!hsn)throw Error('Enter the HSN code for this spare part.');
   return commitBeforeHsn.apply(this,arguments);
  };
 }
 let scanDialog=null,returnFocus=null,scanContext=null;
 function closeScanner(){
  if(scanDialog?.open)scanDialog.close();
  if(returnFocus?.isConnected)returnFocus.focus();
  scanContext=null;
 }
 function openScanner(button,entry=false){
  returnFocus=button;scanContext=entry?{draft:jobDraft,lines:document.querySelector('#partLines')}:null;
  if(!scanDialog){
   scanDialog=document.createElement('dialog');scanDialog.className='barcodeScanDialog';
   scanDialog.setAttribute('aria-labelledby','barcodeScanTitle');
   scanDialog.innerHTML='<div class="barcodeScanHead"><h2 id="barcodeScanTitle">Scan Manufacturer Barcode</h2><button type="button" class="barcodeClose" aria-label="Close barcode scanner">×</button></div><div class="barcodeScanBody"><div class="barcodeScanIcon" aria-hidden="true">▥</div><h3>Ready to scan</h3><p>Use your USB or Bluetooth barcode reader, or enter the number below.</p><label for="barcodeScan">Manufacturer barcode</label><input type="text" id="barcodeScan" aria-label="Manufacturer barcode to find" autocomplete="off" placeholder="Scan or enter barcode number"><p id="barcodeScanStatus" role="status" aria-live="polite"></p><small>Scanning selects the part only. Review quantity and price, then save as usual.</small></div><div class="barcodeScanActions"><button type="button" class="btn secondary" data-barcode-cancel>Cancel</button><button type="button" class="btn" data-barcode-find>Find Part</button></div>';
   document.body.appendChild(scanDialog);
   scanDialog.querySelector('.barcodeClose').onclick=closeScanner;
   scanDialog.querySelector('[data-barcode-cancel]').onclick=closeScanner;
   scanDialog.addEventListener('cancel',event=>{event.preventDefault();closeScanner()});
   const lookup=()=>{
    const input=scanDialog.querySelector('input'),status=scanDialog.querySelector('#barcodeScanStatus'),result=barcodePartMatch(db.parts,input.value);
    if(result.error){status.textContent=result.error;input.focus();input.select();return}
    if(scanContext){
     if(scanContext.draft!==jobDraft||!scanContext.lines.isConnected){status.textContent='The entry has changed. Close this window and reopen the entry.';return}
     const message=barcodeSelectEntryPart(result.part,jobDraft,document);
     if(message){status.textContent=message;return}
    }else{
     const search=document.querySelector('#search');
     if(!search){status.textContent='Open Spare Parts first, then scan again.';return}
     if(typeof filter!=='undefined')filter='';
     search.value=result.part.id;search.dispatchEvent(new Event('input',{bubbles:true}));
    }
    const message='Selected: '+result.part.name+' · '+result.part.id;
    closeScanner();toast(message);
   };
   scanDialog.querySelector('[data-barcode-find]').onclick=lookup;
   scanDialog.querySelector('input').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();lookup()}});
  }
  scanDialog.querySelector('input').value='';scanDialog.querySelector('#barcodeScanStatus').textContent='';
  scanDialog.showModal();scanDialog.querySelector('input').focus();
 }
 function mount(){
  const lines=document.querySelector('#partLines');
  if(lines&&jobDraft&&['jobs','sales','purchases'].includes(jobDraft.key)&&!document.querySelector('#barcodeLookup')){
   const addButton=document.querySelector(jobDraft.key==='purchases'?'#modalBody [data-purchase-add]':'#modalBody [data-action="addPart"]');
   if(!addButton||addButton.disabled)return;
   const button=document.createElement('button');button.id='barcodeLookup';button.type='button';button.className='btn small barcodeScanButton';
   button.textContent='▥ Scan Barcode';button.title='Select a spare part using its manufacturer barcode';
   const actions=document.createElement('span');actions.className='barcodePartActions';
   addButton.before(actions);actions.append(addButton,button);
   button.onclick=event=>openScanner(event.currentTarget,true);
  }
  if(page==='parts'&&!document.querySelector('#inventoryBarcodeOpen')){
   const toolbar=document.querySelector('#content .toolbar');
   if(toolbar){const button=document.createElement('button');button.id='inventoryBarcodeOpen';button.className='btn small barcodeScanButton';button.type='button';button.textContent='▥ Scan Barcode';button.onclick=()=>openScanner(button);toolbar.appendChild(button)}
  }
 }
 const observer=new MutationObserver(mount);
 observer.observe(document.querySelector('#modalBody'),{childList:true,subtree:true});
 observer.observe(document.querySelector('#content'),{childList:true,subtree:true});
 mount();
})();
