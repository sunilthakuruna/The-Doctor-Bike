'use strict';
/* Align saved record IDs with the prefixes in Business Settings while preserving their links. */
const alignedPrefixFields=[
  ['customers','customerPrefix','Customer Prefix'],['bikes','vehiclePrefix','Vehicle Prefix'],
  ['jobs','jobPrefix','Job Card Prefix'],['parts','partPrefix','Spare Part Prefix'],
  ['services','servicePrefix','Service Prefix'],['staff','mechanicPrefix','Staff Prefix'],
  ['sales','salesPrefix','Sale Prefix'],['purchases','purchasePrefix','Purchase Prefix'],
  ['appointments','appointmentPrefix','Appointment Prefix'],['insurance','insurancePrefix','Insurance Prefix'],
  ['accounts','accountPrefix','Account Prefix'],['receipts','transactionPrefix','Transaction Prefix'],
  ['expenses','expensePrefix','Expense Prefix'],['users','userPrefix','User Prefix']
];
for(const [key,setting] of alignedPrefixFields)if(!db.settings[setting])db.settings[setting]=prefixes[key];
function bankSettingsPanel(){
  const s=db.settings;
  return `<section class="panel"><div class="panelhead"><h2>Bank & Payment Gateway Details</h2></div><div class="panelbody"><p>Printed on invoices for customer payment. These details do not connect a payment gateway or initiate transfers.</p><div class="formgrid">${[{key:'bankName',label:'Bank Name & Branch'},{key:'bankAccount',label:'Account Number'},{key:'bankIfsc',label:'IFSC Code'},{key:'bankHolder',label:'Account Holder Name'}].map(f=>field(f,s)).join('')}</div><p>Manage BHIM UPI ID and QR in the UPI Scan Code section below.</p></div></section><section class="panel"><div class="panelhead"><h2>System ID Prefixes</h2></div><div class="panelbody"><p>Saving Business Settings aligns existing and new entry codes to these prefixes. Linked records are updated together, and original imported codes stay in Source ID for reference.</p><div class="formgrid">${alignedPrefixFields.map(([key,name,label])=>field({key:name,label,required:true},{...s,[name]:s[name]||prefixes[key]})).join('')}</div></div></section>`
}
const nextBeforeCodeAlignment=nextId;
nextId=function(key){
  const config=alignedPrefixFields.find(row=>row[0]===key);
  if(!config)return nextBeforeCodeAlignment(key);
  const prefix=String(db.settings[config[1]]||prefixes[key]).trim(),separator=prefix.endsWith('-')?'':'-';
  const n=Math.max(1000,...db[key].map(row=>Number(String(row.id).split('~')[0].match(/(\d+)$/)?.[1])||1000))+1;
  let id=prefix+separator+n,suffix=2;
  while(db[key].some(row=>row.id===id))id=prefix+separator+n+'~'+suffix++;
  return id;
};
function alignExistingRecordCodes(){
  const idMap=new Map(), usedByKey=new Map();
  for(const [key,setting] of alignedPrefixFields){
    const prefix=String(db.settings[setting]||prefixes[key]).trim(),separator=prefix.endsWith('-')?'':'-';
    const used=new Set();usedByKey.set(key,used);
    for(const [index,row] of db[key].entries()){
      const oldId=String(row.id||'');
      const numeric=oldId.split('~')[0].match(/(\d+)$/)?.[1];
      const seq=numeric||String(1001+index),duplicate=oldId.match(/~(\d+)$/)?.[1];
      const base=prefix+separator+seq;
      let next=base+(duplicate?'~'+duplicate:''),n=2;
      while(used.has(next))next=base+'~'+n++;
      used.add(next);
      if(oldId&&oldId!==next)idMap.set(oldId,next);
      row.id=next;
    }
  }
  const preserve=new Set(['sourceId','sourceKey','originalId','sourceRecordId']);
  const rewrite=(value,keyName='')=>{
    if(Array.isArray(value)){for(let i=0;i<value.length;i++)value[i]=rewrite(value[i],keyName);return value}
    if(value&&typeof value==='object'){
      for(const key of Object.keys(value)){
        const nextKey=idMap.has(key)&&!preserve.has(key)?idMap.get(key):key;
        const child=value[key];
        if(nextKey!==key){delete value[key];value[nextKey]=child}
        value[nextKey]=rewrite(value[nextKey],nextKey);
      }
      return value;
    }
    return typeof value==='string'&&!preserve.has(keyName)?(idMap.get(value)||value):value;
  };
  rewrite(db);
  return idMap.size;
}
const settingsBeforeCodeAlignment=settingsPage;
settingsPage=function(){return settingsBeforeCodeAlignment()};
const bindBeforeCodeAlignment=bindPage;
bindPage=function(){
  bindBeforeCodeAlignment();
  const form=$('#settingsForm');if(!form)return;
  const submit=form.onsubmit;if(!submit)return;
  form.onsubmit=e=>{
    const values=Object.fromEntries(new FormData(form));
    for(const [,setting,label]of alignedPrefixFields){
      const value=String(values[setting]||'').trim();
      if(!value||value.length>30||!/^[a-zA-Z0-9._-]+$/.test(value)){e.preventDefault();return toast(label+': use up to 30 letters, numbers, dot, dash or underscore.')}
    }
    const before=structuredClone(db);
    for(const [,setting]of alignedPrefixFields)db.settings[setting]=String(values[setting]).trim();
    const updated=alignExistingRecordCodes();
    submit(e);
    let persisted=false;try{persisted=localStorage.getItem(STORE)===JSON.stringify(db)}catch{}
    if(!persisted){db=before;render();return toast('Entry codes were not saved. Your existing records were restored; download a backup if browser storage is full.')}
    if(updated)toast(updated+' existing entry code'+(updated===1?' was':'s were')+' aligned; linked records were kept together.');
  };
};

