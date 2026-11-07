const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function scanner({supported=true,pending=false}={}){
 const nodes=new Map(),listeners={},events={};let stopped=0,selected='',resolveStream;
 function node(){return {hidden:false,disabled:false,value:'',textContent:'',isConnected:true,addEventListener(k,f){this[k]=f},setAttribute(){},focus(){},select(){},pause(){},async play(){},prepend(){},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)}}}
 const dialog=node();dialog.showModal=()=>dialog.open=true;dialog.close=()=>{dialog.open=false;dialog.closeEvent?.()};
 dialog.addEventListener=(k,f)=>{if(k==='close')dialog.closeEvent=f;else dialog[k]=f};
 const toolbar={appendChild(button){nodes.set('open',button)}},search=node();search.dispatchEvent=()=>selected=search.value;
 const document={hidden:false,body:{appendChild(){}},createElement(tag){return tag==='dialog'?dialog:node()},addEventListener(k,f){listeners[k]=f},querySelector(s){if(s==='#content .toolbar')return toolbar;if(s==='#search')return search;if(s==='#inventoryBarcodeOpen')return nodes.get('open');return null}};
 const stream={getTracks:()=>[{stop(){stopped++}}]};
 const context={document,schemas:{parts:[{key:'name'},{key:'hsn'}]},db:{parts:[{id:'part1',name:'Plug',barcode:'001234'}]},page:'parts',jobDraft:null,MutationObserver:class{observe(){}},toast(){},Event,window:{isSecureContext:true,BarcodeDetector:supported},navigator:{mediaDevices:{getUserMedia:()=>pending?new Promise(r=>resolveStream=r):Promise.resolve(stream)}},BarcodeDetector:class{static async getSupportedFormats(){return ['code_128']}async detect(){return [{rawValue:'001234'}]}},setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../dist/barcode-inventory.js','utf8'),context);
 nodes.get('open').onclick();
 return {dialog,nodes,listeners,stream,get stopped(){return stopped},get selected(){return selected},resolve(){resolveStream(stream)}};
}
test('camera scan selects matching part and releases camera',async()=>{
 const s=scanner();await s.nodes.get('[data-barcode-camera]').onclick();await new Promise(setImmediate);
 assert.equal(s.selected,'part1');assert.equal(s.stopped,1);assert.equal(s.dialog.open,false);
});
test('closing while permission is pending releases late camera stream',async()=>{
 const s=scanner({pending:true}),start=s.nodes.get('[data-barcode-camera]').onclick();await new Promise(setImmediate);
 s.nodes.get('[data-barcode-cancel]').onclick();s.resolve();await start;
 assert.equal(s.stopped,1);assert.equal(s.selected,'');
});
test('unsupported browser retains manual input and explains camera limitation',async()=>{
 const s=scanner({supported:false});await s.nodes.get('[data-barcode-camera]').onclick();
 assert.match(s.nodes.get('#barcodeScanStatus').textContent,/unavailable/);
 assert.equal(s.nodes.get('[data-barcode-camera]').disabled,false);
});
for(const key of ['Enter','Tab'])test('keyboard barcode reader '+key+' suffix selects matching part',()=>{
 const s=scanner(),input=s.nodes.get('input');input.value='001234';
 input.keydown({key,preventDefault(){},stopPropagation(){}});assert.equal(s.selected,'part1');
});

