const collections=['parts','purchases','stockMovements','jobs','sales','receipts','appointments','trash'];
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});

export async function onRequest({request,env}){
 const db=env.DB;
 try{
  await db.batch([
   db.prepare('CREATE TABLE IF NOT EXISTS inventory_head (id INTEGER PRIMARY KEY CHECK(id=1), version TEXT NOT NULL)'),
   db.prepare('CREATE TABLE IF NOT EXISTS inventory_chunks (version TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(version,position))')
  ]);
  if(request.method==='GET'){
   const {results}=await db.prepare('SELECT h.version,c.data FROM inventory_head h JOIN inventory_chunks c ON c.version=h.version ORDER BY c.position').all();
   return reply(results.length?{version:results[0].version,data:JSON.parse(results.map(row=>row.data).join(''))}:{version:null,data:null});
  }
  if(request.method!=='PUT')return reply({error:'Method not allowed.'},405);
  let body;
  try{body=await request.json()}catch{return reply({error:'Invalid JSON.'},400)}
  const {version,data}=body||{};
  if((version!==null&&(typeof version!=='string'||version.length>40))||!data||
     collections.some(key=>!Array.isArray(data[key])))return reply({error:'Invalid inventory data.'},400);
  const snapshot=JSON.stringify(Object.fromEntries(collections.map(key=>[key,data[key]])));
  if(new TextEncoder().encode(snapshot).length>12000000)return reply({error:'Inventory is too large to sync.'},413);
  const next=crypto.randomUUID();
  const update=version===null
   ?db.prepare('INSERT OR IGNORE INTO inventory_head(id,version) VALUES (1,?)').bind(next)
   :db.prepare('UPDATE inventory_head SET version=? WHERE id=1 AND version=?').bind(next,version);
  const batch=[update];
  const write=db.prepare('INSERT INTO inventory_chunks(version,position,data) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM inventory_head WHERE version=?)');
  for(let offset=0;offset<snapshot.length;){
   let end=Math.min(offset+200000,snapshot.length);
   if(/[\uD800-\uDBFF]/.test(snapshot[end-1]))end--;
   batch.push(write.bind(next,offset,snapshot.slice(offset,end),next));
   offset=end;
  }
  batch.push(db.prepare('DELETE FROM inventory_chunks WHERE version<>? AND EXISTS (SELECT 1 FROM inventory_head WHERE version=?)').bind(next,next));
  const [result]=await db.batch(batch);
  if(!result.meta.changes)return reply({error:'Inventory changed in another browser.'},409);
  return reply({version:next});
 }catch(error){
  console.error('Inventory database request failed',error);
  return reply({error:'Inventory could not be synced.'},500);
 }
}
