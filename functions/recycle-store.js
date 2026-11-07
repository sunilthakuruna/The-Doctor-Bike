// Deleted data stays private on D1; list responses contain metadata only.
export const recycleSchema="CREATE TABLE IF NOT EXISTS recycle_bin (id TEXT PRIMARY KEY,scope TEXT NOT NULL,collection TEXT NOT NULL,record_id TEXT NOT NULL,label TEXT NOT NULL,payload TEXT NOT NULL,deleted_at TEXT NOT NULL,deleted_by TEXT NOT NULL,restored_at TEXT)";
export async function ensureRecycle(db){
 await db.prepare(recycleSchema).run();
 await db.prepare('CREATE TABLE IF NOT EXISTS recycle_actor (id INTEGER PRIMARY KEY CHECK(id=1),actor TEXT NOT NULL)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS recycle_operations (entry_id TEXT PRIMARY KEY, action TEXT NOT NULL)').run();
 const {results}=await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
 const tables=new Set(results.map(row=>row.name));
 const specs={
  customers:{collection:'customers',payload:"json_object('record',json_object('id',OLD.id,'name',OLD.name,'mobile',OLD.mobile,'alt_mobile',OLD.alt_mobile,'email',OLD.email,'address',OLD.address,'city',OLD.city,'state',OLD.state,'pin',OLD.pin,'gst',OLD.gst,'type',OLD.type,'dob',OLD.dob))",label:'OLD.name'},
  vehicles:{collection:'bikes',payload:"json_object('record',json(OLD.data))",label:'OLD.number'},
  services:{collection:'services',payload:"json_object('record',json(OLD.data))",label:'OLD.name'},
  staff:{collection:'staff',payload:tables.has('staff_attachments')?"json_object('record',json(OLD.data),'attachments',json(COALESCE((SELECT json_group_object(field,data) FROM staff_attachments WHERE staff_id=OLD.id),'{}')))":"json_object('record',json(OLD.data))",label:"COALESCE(json_extract(OLD.data,'$.name'),OLD.id)"},
  accounts:{collection:'accounts',payload:"json_object('record',json(OLD.data))",label:"COALESCE(json_extract(OLD.data,'$.name'),OLD.id)"},
  expenses:{collection:'expenses',payload:"json_object('record',json(OLD.data))",label:"COALESCE(json_extract(OLD.data,'$.description'),OLD.id)"}
 };
 for(const [table,spec] of Object.entries(specs)){
  if(!tables.has(table))continue;
  await db.prepare(`CREATE TRIGGER IF NOT EXISTS recycle_capture_${table}_v1 BEFORE DELETE ON ${table} BEGIN
   INSERT INTO recycle_bin(id,scope,collection,record_id,label,payload,deleted_at,deleted_by)
   VALUES (lower(hex(randomblob(16))),'table:${table}','${spec.collection}',OLD.id,${spec.label},${spec.payload},strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM recycle_actor WHERE id=1),'Unknown'));
  END`).run();
 }
}
export async function recycleActor(db,user){
 await db.prepare('CREATE TABLE IF NOT EXISTS recycle_actor (id INTEGER PRIMARY KEY CHECK(id=1),actor TEXT NOT NULL)').run();
 // Return a statement to execute in the same transaction as the deletion.
 return db.prepare('INSERT INTO recycle_actor(id,actor) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET actor=excluded.actor').bind(String(user?.username||user?.name||user?.id||'Unknown'));
}
export async function recycleDeleteBatch(db,statements,user){
 await ensureRecycle(db);
 const actor=await recycleActor(db,user);
 return (await db.batch([actor,...statements])).slice(1);
}
export async function readRecycleSnapshot(db,scope){
 const exists=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(scope+'_head').first();
 if(!exists)return {version:null,data:{}};
 const {results}=await db.prepare(`SELECT h.version,c.data FROM ${scope}_head h JOIN ${scope}_chunks c ON c.version=h.version ORDER BY c.position`).all();
 return {version:results[0]?.version??null,data:results.length?JSON.parse(results.map(row=>row.data).join('')):{}};
}
export function removedSnapshotRecords(scope,current,next){
 const removed=[];
 for(const [collection,records] of Object.entries(current)){
  if(collection==='trash'||!Array.isArray(records)||!Array.isArray(next[collection]))continue;
  const remaining=new Set(next[collection].map(record=>record?.id));
  for(const record of records)if(record?.id&&!remaining.has(record.id)){
   if(collection==='receipts'&&(next.trash||[]).some(entry=>(entry.receipts||[]).some(receipt=>receipt.id===record.id)))continue;
   const legacy=(next.trash||[]).find(entry=>entry.key===collection&&entry.record?.id===record.id);
   removed.push({scope,collection,record,receipts:legacy?.receipts||[]});
  }
 }
 return removed;
}
export function archiveSnapshotStatements(db,scope,current,next,version,user){
 if(!['inventory','insurance','amc','service_reminders','stock_counts'].includes(scope))return [];
 return removedSnapshotRecords(scope,current,next).map(item=>db.prepare(`INSERT INTO recycle_bin(id,scope,collection,record_id,label,payload,deleted_at,deleted_by)
  SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM ${scope}_head WHERE id=1 AND version=?)`).bind(
  crypto.randomUUID(),scope,item.collection,item.record.id,String(item.record.name||item.record.number||item.record.description||item.record.id),
  JSON.stringify({record:item.record,receipts:item.receipts}),new Date().toISOString(),String(user?.username||user?.name||user?.id||'Unknown'),version));
}
