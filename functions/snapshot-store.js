const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});

const auditLabels={
 inventory:'Inventory and transactions',
 insurance:'Insurance policies',
 amc:'AMC plans and reminders',
 service_reminders:'Service reminder history',
 lists:'Managed dropdown lists',
 business_settings:'Business settings and invoice templates',
 stock_counts:'Stock verification sheets'
};

export function snapshotHandler(scope,collections,validators={}){
 const head=scope+"_head", chunks=scope+"_chunks";
 return async function onRequest({request,env}){
  const db=env.DB;
  try{
   await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS ${head} (id INTEGER PRIMARY KEY CHECK(id=1), version TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ${chunks} (version TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(version,position))`)
   ]);
   if(request.method==='GET'){
    const {results}=await db.prepare(`SELECT h.version,c.data FROM ${head} h JOIN ${chunks} c ON c.version=h.version ORDER BY c.position`).all();
    return reply(results.length?{version:results[0].version,data:JSON.parse(results.map(row=>row.data).join(''))}:{version:null,data:null});
   }
   if(request.method!=='PUT')return reply({error:'Method not allowed.'},405);
   let body;
   try{body=await request.json()}catch{return reply({error:'Invalid JSON.'},400)}
   const {version,data}=body||{};
   if((version!==null&&(typeof version!=='string'||version.length>40))||!data||
      collections.some(key=>!(validators[key]||Array.isArray)(data[key])))return reply({error:'Invalid records.'},400);
   const snapshot=JSON.stringify(Object.fromEntries(collections.map(key=>[key,data[key]])));
   if(new TextEncoder().encode(snapshot).length>12000000)return reply({error:'The saved records are too large to sync.'},413);
   const next=crypto.randomUUID();
   const update=version===null
    ?db.prepare(`INSERT OR IGNORE INTO ${head}(id,version) VALUES (1,?)`).bind(next)
    :db.prepare(`UPDATE ${head} SET version=? WHERE id=1 AND version=?`).bind(next,version);
   const batch=[update];
   const write=db.prepare(`INSERT INTO ${chunks}(version,position,data) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM ${head} WHERE version=?)`);
   for(let offset=0;offset<snapshot.length;){
    let end=Math.min(offset+200000,snapshot.length);
    if(/[\uD800-\uDBFF]/.test(snapshot[end-1]))end--;
    batch.push(write.bind(next,offset,snapshot.slice(offset,end),next));
    offset=end;
   }
   batch.push(db.prepare(`DELETE FROM ${chunks} WHERE version<>? AND EXISTS (SELECT 1 FROM ${head} WHERE version=?)`).bind(next,next));
   batch.push(db.prepare(`INSERT INTO audit_logs(action,detail,actor)
    SELECT ?,?,'Owner' WHERE EXISTS (SELECT 1 FROM ${head} WHERE version=?)`)
    .bind(version===null?'Initialize':'Update',(auditLabels[scope]||scope)+' saved to D1',next));
   const [result]=await db.batch(batch);
   if(!result.meta.changes)return reply({error:'Records changed in another browser.'},409);
   return reply({version:next});
  }catch(error){
   console.error(scope+' database request failed',error);
   return reply({error:'Records could not be synced.'},500);
  }
 };
}
