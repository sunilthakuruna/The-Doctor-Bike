// A shared storage endpoint must enforce rights for each collection and change.
const routes={parts:['parts','godown'],purchases:['purchases'],stockMovements:['godown','parts'],jobs:['jobs'],sales:['sales'],appointments:['appointments']};
const labels={parts:'Spare Parts',godown:'Godown Stock',purchases:'Purchase',jobs:'Job Card',sales:'Spare Parts Sale',appointments:'Appointment Booking',payments:'Payment Details'};
const nouns={parts:'Spare Part',purchases:'Purchase',jobs:'Job Card',sales:'Sale',appointments:'Appointment'};
const stable=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
function rules(user){try{return {permissions:typeof user.permissions==='string'?JSON.parse(user.permissions):user.permissions||{},restrictions:typeof user.action_restrictions==='string'?JSON.parse(user.action_restrictions):user.actionRestrictions||{}}}catch{return {permissions:{},restrictions:{}}}}
function grant(user,module,action='read',subactions=[]){if(user?.status!=='Active')return false;if(user.role==='Admin')return true;const {permissions,restrictions}=rules(user),entry=permissions[module];return entry?.read===true&&entry?.[action]===true&&subactions.every(name=>restrictions[labels[module]]?.[name]!==true)}
function receiptModule(record,data){if((data.jobs||[]).some(row=>row.id===record.bill))return 'jobs';if((data.sales||[]).some(row=>row.id===record.bill))return 'sales';return null}
function visible(user,key,record,data){
 if(user.role==='Admin')return true;
 if(key==='receipts'){const module=receiptModule(record,data);return grant(user,'payments')||!!module&&grant(user,module)}
 if(key==='trash')return !!routes[record.key]&&routes[record.key].some(module=>grant(user,module));
 return (routes[key]||[]).some(module=>grant(user,module));
}
export function inventoryAccess(user,method){if(user?.status!=='Active')return false;if(user.role==='Admin')return true;return [...new Set([...Object.values(routes).flat(),'payments'])].some(module=>grant(user,module)&&(['GET','HEAD'].includes(method)||['write','edit','delete'].some(action=>grant(user,module,action))))}
export function inventoryProjection(user,data){return Object.fromEntries(Object.entries(data).map(([key,records])=>[key,records.filter(row=>visible(user,key,row,data))]))}
function allowedChange(user,key,action,record,previous,data){
 const verb={write:'Add',edit:'Edit',delete:'Delete'}[action];
 if(key==='receipts'){const module=receiptModule(record,data);return grant(user,'payments',action,['Receive Customer Payment'])||!!module&&grant(user,module,action,['Receive Payment',...(module==='jobs'?['Record Due Payment']:[])])}
 if(key==='stockMovements')return grant(user,'godown',action,[record.kind==='transfer'?'Transfer to Main Stock':'Stock Adjustment'])||record.kind!=='transfer'&&grant(user,'parts',action,['Stock Adjustment']);
 if(key==='parts'&&grant(user,'godown',action,['Edit Part Details']))return action==='edit'&&(!previous||record.opening===previous.opening||grant(user,'godown',action,['Stock Adjustment']));
 const module=routes[key]?.[0];if(!module||!grant(user,module,action,[verb+' '+nouns[key]]))return false;
 if(key==='parts'&&previous&&record.opening!==previous.opening&&!grant(user,module,action,['Stock Adjustment']))return false;
 if(key==='jobs'&&previous){if(record.status!==previous.status&&!grant(user,module,action,['Change Job Status']))return false;if(record.advance!==previous.advance&&!grant(user,module,action,['Receive Payment']))return false}
 if(key==='purchases'&&action!=='delete'){const target=String(record.stockLocation||record.stockDestination||record.destination||'main').toLowerCase();if(!grant(user,module,action,['Receive Stock',target.includes('godown')?'Receive to Godown':'Receive to Main Stock']))return false}
 return true;
}
export function mergeInventory(user,current,incoming){
 if(user.role==='Admin')return incoming;
 const merged={...current};
 for(const [key,rows]of Object.entries(incoming)){
  if(key==='trash')continue;
  const existing=current[key]||[],shown=existing.filter(row=>visible(user,key,row,current)),hidden=existing.filter(row=>!visible(user,key,row,current));
  const ids=new Set();for(const row of rows){if(!row||typeof row.id!=='string'||ids.has(row.id))throw new Error('Invalid or duplicate record ID.');ids.add(row.id)}
  const deleted=shown.filter(row=>!ids.has(row.id));
  if(deleted.length>1&&(rules(user).restrictions[labels[routes[key]?.[0]]]?.['Bulk Delete']===true))throw new Error('Bulk Delete is restricted.');
  for(const row of rows){const prior=existing.find(item=>item.id===row.id);if(prior&&!shown.includes(prior))throw new Error('A restricted record cannot be changed.');if(!prior||stable(prior)!==stable(row)){if(!allowedChange(user,key,prior?'edit':'write',row,prior,{...current,...incoming}))throw new Error('Permission is not granted for this change.')}}
  for(const row of shown)if(!ids.has(row.id)&&!allowedChange(user,key,'delete',row,row,current))throw new Error('Delete permission is not granted.');
  merged[key]=[...hidden,...rows];
 }
 // Recycle-bin entries may only accompany a permitted deletion, and retain
 // the exact previous bill and receipts rather than client-supplied copies.
 const old=current.trash||[],shown=old.filter(row=>visible(user,'trash',row,current)),hidden=old.filter(row=>!visible(user,'trash',row,current));
 const identity=row=>row.key+'|'+row.record?.id;
 const trash=[];for(const entry of incoming.trash||[]){const prior=shown.find(row=>identity(row)===identity(entry));if(prior){if(stable(prior)!==stable(entry))throw new Error('Archived records cannot be edited.');trash.push(prior);continue}
  const original=current[entry.key]?.find(row=>row.id===entry.record?.id);if(!original||merged[entry.key]?.some(row=>row.id===original.id)||!allowedChange(user,entry.key,'delete',original,original,current))throw new Error('Archive permission is not granted.');
  trash.push({...entry,record:original,receipts:(current.receipts||[]).filter(row=>row.bill===original.id)});
 }
 for(const entry of shown)if(!trash.some(row=>identity(row)===identity(entry)))throw new Error('Restoring or permanently removing archived records requires an administrator.');
 merged.trash=[...hidden,...trash];return merged;
}
export const inventoryPolicy={access:inventoryAccess,project:inventoryProjection,merge:mergeInventory,signature:user=>stable(rules(user))};
