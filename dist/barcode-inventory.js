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
 if(hsnField){hsnField.required=false;hsnField.label='HSN Code'}
 const nameIndex=schemas.parts.findIndex(field=>field.key==='name');
 schemas.parts.splice(nameIndex+1,0,{key:'barcode',label:'Manufacturer Barcode'});
 document.addEventListener('submit',event=>{
  if(event.target.id!=='recordForm'||editing?.key!=='parts')return;
  const input=event.target.querySelector('[name="barcode"]'),code=input?.value.trim();
  if(code&&db.parts.some(part=>part.id!==editing.id&&String(part.barcode||'').trim()===code)){
   event.preventDefault();event.stopImmediatePropagation();toast('This manufacturer barcode is already assigned to another part.');input.focus();
  }
 },true);
 let scanDialog=null,returnFocus=null,scanContext=null,cameraStream=null,cameraTimer=null,cameraGeneration=0;
 function stopCamera(){
  cameraGeneration++;clearTimeout(cameraTimer);cameraTimer=null;
  cameraStream?.getTracks().forEach(track=>track.stop());cameraStream=null;
  const video=scanDialog?.querySelector('video');
  if(video){video.pause();video.srcObject=null;video.hidden=true}
  const stop=scanDialog?.querySelector('[data-barcode-stop-camera]');if(stop)stop.hidden=true;
  const start=scanDialog?.querySelector('[data-barcode-camera]');if(start)start.disabled=false;
 }
 function closeScanner(){
  stopCamera();
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
   const cameraControls=document.createElement('div');cameraControls.className='barcodeCameraControls';
   cameraControls.innerHTML='<button type="button" class="btn" data-barcode-camera>Scan with Camera</button><button type="button" class="btn secondary" data-barcode-stop-camera hidden>Stop Camera</button><video class="barcodeCameraVideo" playsinline muted hidden aria-label="Barcode camera preview"></video>';
   scanDialog.querySelector('.barcodeScanBody').prepend(cameraControls);
   scanDialog.addEventListener('close',stopCamera);
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
   scanDialog.querySelector('input').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();event.stopPropagation();lookup()}});
   scanDialog.querySelector('[data-barcode-stop-camera]').onclick=stopCamera;
   scanDialog.querySelector('[data-barcode-camera]').onclick=async()=>{
    stopCamera();const generation=cameraGeneration;
    const status=scanDialog.querySelector('#barcodeScanStatus'),start=scanDialog.querySelector('[data-barcode-camera]'),video=scanDialog.querySelector('video');
    start.disabled=true;
    try{
     if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Camera needs a secure HTTPS page and camera permission. Use a barcode reader or enter the number instead.');
     if(!window.BarcodeDetector)throw new Error('Camera barcode scanning is unavailable in this browser. Try Chrome on Android, or use a barcode reader or enter the number.');
     const formats=await BarcodeDetector.getSupportedFormats();
     if(generation!==cameraGeneration||!scanDialog.open)return;
     if(!formats.length)throw new Error('This browser has no supported barcode formats. Use a barcode reader or enter the number.');
     const detector=new BarcodeDetector({formats});
     const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
     if(generation!==cameraGeneration||!scanDialog.open){stream.getTracks().forEach(track=>track.stop());return}
     cameraStream=stream;video.srcObject=stream;video.hidden=false;
     scanDialog.querySelector('[data-barcode-stop-camera]').hidden=false;
     await video.play();
     status.textContent='Point the rear camera at the manufacturer barcode.';
     const detect=async()=>{
      if(generation!==cameraGeneration||!scanDialog.open||document.hidden)return;
      try{
       const results=await detector.detect(video);
       if(generation!==cameraGeneration||!scanDialog.open)return;
       const code=results.find(result=>result.rawValue)?.rawValue;
       if(code){stopCamera();scanDialog.querySelector('input').value=code;lookup();return}
      }catch(error){if(generation!==cameraGeneration)return;status.textContent='Keep the barcode steady and fully inside the camera view.'}
      cameraTimer=setTimeout(detect,180);
     };
     detect();
    }catch(error){
     if(generation!==cameraGeneration)return;
     stopCamera();status.textContent=error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in browser settings, or use a barcode reader.':error.name==='NotFoundError'?'No camera was found. Use a barcode reader or enter the number.':error.message;
    }
   };
  }
  scanDialog.querySelector('input').value='';scanDialog.querySelector('#barcodeScanStatus').textContent='';
  scanDialog.showModal();scanDialog.querySelector('input').focus();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});
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
