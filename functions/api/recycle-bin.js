import {ensureRecycle,readRecycleSnapshot} from '../recycle-store.js';
import {validatePartBarcodes} from '../part-barcodes.js';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const scopes={inventory:['parts','purchases','stockMovements','jobs','sales','receipts','appointments'],insurance:['insurance'],amc:['amcPlans','amcReminderLogs'],service_reminders:['serviceReminderLogs'],stock_counts:['stockCounts']};
const tables={customers:'customers',bikes:'vehicles',services:'services',staff:'staff',accounts:'accounts',expenses:'expenses'};
function replaceSnapshot(db,scope,current,next){
 const version=crypto.randomUUID(),snapshot=JSON.stringify(next);
 if(new TextEncoder().encode(snapshot).length>12000000)throw Error('Restoration would exceed the record storage limit.');
 const batch=[db.prepare(`UPDATE ${scope}_head SET version=? WHERE id=1 AND version=?`).bind(version,current.version)];
 for(let offset=0;offset<snapshot.length;){
  let end=Math.min(offset+200000,snapshot.length);if(/[\uD800-\uDBFF]/.test(snapshot[end-1]))end--;
  batch.push(db.prepare(`INSERT INTO ${scope}_chunks(version,position,data) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM ${scope}_head WHERE version=?)`).bind(version,offset,snapshot.slice(offset,end),version));offset=end;
 }
 batch.push(db.prepare(`DELETE FROM ${scope}_chunks WHERE version<>? AND EXISTS (SELECT 1 FROM ${scope}_head WHERE version=?)`).bind(version,version));
 return {batch,version};
}
export function mainBalance(data,id,location='main'){
 let amount=location==='main'?Number(data.parts?.find(p=>p.id===id)?.opening||0):0;
 for(const bill of data.purchases||[])if(bill.status!=='Cancelled'&&(bill.stockLocation||'main')===location)for(const line of bill.partLines||[])if(line.part===id)amount+=Number(line.qty||0);
 for(const move of data.stockMovements||[])if(move.part===id){if(move.kind==='opening'&&location==='godown')amount+=Number(move.qty||0);if(move.kind==='transfer')amount+=Number(move.qty||0)*(location==='main'?1:-1)}
 if(location==='main')for(const bill of [...data.jobs||[],...data.sales||[]])if(bill.status!=='Cancelled')for(const line of bill.partLines||[])if(line.part===id)amount-=Number(line.qty||0);
 return amount;
}
async function requireRecord(db,collection,id){
 if(!id)return;
 const table=tables[collection];if(!table)throw Error('Unsupported linked module.');
 const exists=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
 if(!exists||!await db.prepare(`SELECT id FROM ${table} WHERE id=?`).bind(id).first())throw Error('Restore the linked '+collection+' record first: '+id);
}
async function validateRestore(db,collection,record,inventory,receipts=[]){
 if(record.customer)await requireRecord(db,'customers',record.customer);
 if(record.bike)await requireRecord(db,'bikes',record.bike);
 if(record.bike&&record.customer){
  const vehicle=await db.prepare('SELECT customer FROM vehicles WHERE id=?').bind(record.bike).first();
  if(vehicle.customer!==record.customer)throw Error('The vehicle now belongs to another customer.');
 }
 if(record.mechanic)await requireRecord(db,'staff',record.mechanic);
 if(record.account)await requireRecord(db,'accounts',record.account);
 if(collection==='expenses'&&record.staff)await requireRecord(db,'staff',record.staff);
 for(const line of record.serviceLines||[])if(line.service)await requireRecord(db,'services',line.service);
 for(const line of record.partLines||[])if(!inventory.parts?.some(p=>p.id===line.part))throw Error('Restore the linked spare part first: '+line.part);
 if(collection==='stockMovements'&&!inventory.parts?.some(p=>p.id===record.part))throw Error('Restore the linked spare part first.');
 if(collection==='receipts'&&![...inventory.jobs||[],...inventory.sales||[],...inventory.purchases||[]].some(b=>b.id===record.bill))throw Error('Restore the linked bill first.');
 if(collection==='appointments'&&record.job&&!inventory.jobs?.some(b=>b.id===record.job))throw Error('Restore the linked Job Card first.');
 if(['jobs','sales'].includes(collection)&&record.status!=='Cancelled'){
  const used=new Map();
  for(const line of record.partLines||[])used.set(line.part,(used.get(line.part)||0)+Number(line.qty||0));
  for(const [part,qty]of used)if(qty>mainBalance(inventory,part))throw Error('Not enough Main Stock to restore this bill: '+part);
 }
 if(collection==='purchases'&&record.status!=='Cancelled'&&(record.stockLocation||'main')==='main')
  for(const line of record.partLines||[])if(mainBalance(inventory,line.part)>0)throw Error('Main Stock must be zero before restoring this Main Stock purchase.');
 for(const receipt of receipts){
  if(inventory.receipts?.some(r=>r.id===receipt.id))throw Error('A receipt ID is already in use.');
  await requireRecord(db,'accounts',receipt.account);
 }
}
function tableInsert(db,collection,record){
 const table=tables[collection];if(!table)throw Error('Unsupported record type.');
 if(collection==='customers'){
  const keys=['id','name','mobile','alt_mobile','email','address','city','state','pin','gst','type','dob'];
  return db.prepare('INSERT INTO customers('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')').bind(...keys.map(key=>record[key]??''));
 }
 if(collection==='bikes')return db.prepare('INSERT INTO vehicles(id,customer,number,data) VALUES (?,?,?,?)').bind(record.id,record.customer,record.number,JSON.stringify(record));
 if(collection==='services')return db.prepare('INSERT INTO services(id,name,data) VALUES (?,?,?)').bind(record.id,record.name,JSON.stringify(record));
 return db.prepare(`INSERT INTO ${table}(id,data) VALUES (?,?)`).bind(record.id,JSON.stringify(record));
}
async function importLegacy(db){
 const {data}=await readRecycleSnapshot(db,'inventory');
 for(const entry of data.trash||[]){
  if(!scopes.inventory.includes(entry.key)||!entry.record?.id)continue;
  await db.prepare('INSERT OR IGNORE INTO recycle_bin(id,scope,collection,record_id,label,payload,deleted_at,deleted_by) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM recycle_bin WHERE scope=? AND collection=? AND record_id=? AND (restored_at IS NULL OR deleted_at=?))')
   .bind('legacy:'+entry.key+':'+entry.record.id+':'+entry.removedAt,'inventory',entry.key,entry.record.id,String(entry.record.name||entry.record.id),JSON.stringify({record:entry.record,receipts:entry.receipts||[]}),entry.removedAt||'Unknown','Legacy archive','inventory',entry.key,entry.record.id,entry.removedAt||'Unknown').run();
 }
}
export async function onRequest({request,env,data={}}){
 if(data.user?.role!=='Admin'||data.user?.status!=='Active')return reply({error:'Only Admin can access the Recycle Bin.'},403);
 const db=env.DB,actor=String(data.user.username||data.user.id);
 try{
  await ensureRecycle(db);
  if(request.method==='GET'){
   await importLegacy(db);
   const {results}=await db.prepare('SELECT id,collection,record_id,label,deleted_at,deleted_by FROM recycle_bin WHERE restored_at IS NULL ORDER BY deleted_at DESC').all();
   return reply({data:results});
  }
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
  let body;try{body=await request.json()}catch{return reply({error:'Invalid request.'},400)}
  if(typeof body?.id!=='string'||!['restore','purge'].includes(body.action))return reply({error:'Choose a record and action.'},400);
  const item=await db.prepare('SELECT * FROM recycle_bin WHERE id=? AND restored_at IS NULL').bind(body.id).first();
  if(!item)return reply({error:'This entry was already restored or permanently deleted. Refresh the list.'},409);
  if(body.action==='purge'){
   // Retain a tombstone to avoid re-importing legacy archives. Remove their private payload.
   const current=await readRecycleSnapshot(db,'inventory');
   const legacy=(current.data.trash||[]).some(entry=>entry.key===item.collection&&entry.record?.id===item.record_id);
   if(legacy&&item.scope==='inventory'){
    const next={...current.data,trash:current.data.trash.filter(entry=>!(entry.key===item.collection&&entry.record?.id===item.record_id))};
    const {batch,version}=replaceSnapshot(db,'inventory',current,next);
    batch.push(db.prepare("INSERT INTO recycle_operations(entry_id,action) SELECT ?,'purge' WHERE EXISTS (SELECT 1 FROM inventory_head WHERE version=?)").bind(item.id,version),
     db.prepare("UPDATE recycle_bin SET payload='{}',restored_at=? WHERE id=? AND EXISTS (SELECT 1 FROM inventory_head WHERE version=?)").bind(new Date().toISOString(),item.id,version),
     db.prepare("INSERT INTO audit_logs(action,detail,actor) SELECT 'Permanent Delete',?,? WHERE EXISTS (SELECT 1 FROM inventory_head WHERE version=?)").bind(item.collection+' '+item.record_id,actor,version));
    const [updated]=await db.batch(batch);if(!updated.meta.changes)return reply({error:'Records changed. Refresh before trying again.'},409);
   }else await db.batch([db.prepare("INSERT INTO recycle_operations(entry_id,action) VALUES (?,'purge')").bind(item.id),db.prepare("UPDATE recycle_bin SET payload='{}',restored_at=? WHERE id=? AND restored_at IS NULL").bind(new Date().toISOString(),item.id),db.prepare("INSERT INTO audit_logs(action,detail,actor) VALUES ('Permanent Delete',?,?)").bind(item.collection+' '+item.record_id,actor)]);
   return reply({data:{id:item.id}});
  }
  const {record,receipts=[]}=JSON.parse(item.payload);
  if(!record||record.id!==item.record_id)throw Error('The archived record is invalid.');
  const inventory=await readRecycleSnapshot(db,'inventory');
  await validateRestore(db,item.collection,record,inventory.data,receipts);
  const finished=new Date().toISOString();
  if(item.scope.startsWith('table:')){
   if(item.scope!=='table:'+tables[item.collection])throw Error('Unsupported archived module.');
   const batch=[db.prepare("INSERT INTO recycle_operations(entry_id,action) VALUES (?,'restore')").bind(item.id),tableInsert(db,item.collection,record)];
   if(item.collection==='staff'){
    const files=JSON.parse(item.payload).attachments||{};
    for(const [field,value]of Object.entries(files))batch.push(db.prepare('INSERT INTO staff_attachments(staff_id,field,data) VALUES (?,?,?)').bind(record.id,field,value));
   }
   batch.push(db.prepare("UPDATE recycle_bin SET restored_at=? WHERE id=? AND restored_at IS NULL").bind(finished,item.id),db.prepare("INSERT INTO audit_logs(action,detail,actor) VALUES ('Restore',?,?)").bind(item.collection+' '+record.id,actor));
   await db.batch(batch);
  }else{
   if(!scopes[item.scope]?.includes(item.collection))throw Error('This module does not support record restoration.');
   const current=item.scope==='inventory'?inventory:await readRecycleSnapshot(db,item.scope);
   const next=structuredClone(current.data);
   next[item.collection]=next[item.collection]||[];
   if(next[item.collection].some(r=>r.id===record.id))throw Error('This record ID already exists. Keep the existing entry or remove its duplicate first.');
   next[item.collection].push(record);
   if(item.scope==='inventory'){
    validatePartBarcodes(current.data,next,{requireHsn:false});
    next.receipts=[...next.receipts||[],...receipts];
    next.trash=(next.trash||[]).filter(r=>!(r.key===item.collection&&r.record?.id===record.id));
    for(const part of next.parts||[])if(mainBalance(next,part.id)<0||mainBalance(next,part.id,'godown')<0)throw Error('Restore would create negative stock. Restore the source purchase first.');
   }
   const scope=item.scope,{batch,version}=replaceSnapshot(db,scope,current,next);
   batch.push(db.prepare(`INSERT INTO recycle_operations(entry_id,action) SELECT ?,'restore' WHERE EXISTS (SELECT 1 FROM ${scope}_head WHERE version=?)`).bind(item.id,version),
    db.prepare(`UPDATE recycle_bin SET restored_at=? WHERE id=? AND EXISTS (SELECT 1 FROM ${scope}_head WHERE version=?)`).bind(finished,item.id,version),
    db.prepare(`INSERT INTO audit_logs(action,detail,actor) SELECT 'Restore',?,? WHERE EXISTS (SELECT 1 FROM ${scope}_head WHERE version=?)`).bind(item.collection+' '+record.id,actor,version));
   const [updated]=await db.batch(batch);if(!updated.meta.changes)return reply({error:'Records changed in another browser. Refresh before restoring.'},409);
  }
  return reply({data:{id:item.id,collection:item.collection,recordId:record.id}});
 }catch(error){
  console.error('Recycle Bin request failed',error);
  return reply({error:/UNIQUE|constraint/i.test(error.message)?'A duplicate ID, vehicle number, or missing linked record prevents restoration.':error.message||'Recycle Bin request failed.'},409);
 }
}
