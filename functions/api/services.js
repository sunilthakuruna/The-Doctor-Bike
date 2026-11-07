import {recycleDeleteBatch} from '../recycle-store.js';
const schema = `CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`;
const reply = (body, status=200) => new Response(JSON.stringify(body), {
 status, headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
export async function onRequest({request,env,data:contextData={}}) {
 try {
  // Idempotent bootstrap also supports dashboard deployments without Wrangler migrations.
  await env.DB.prepare(schema).run();
  if(request.method==='GET') {
   const rows=await env.DB.prepare('SELECT data FROM services ORDER BY name').all();
   return reply({data:rows.results.map(row=>JSON.parse(row.data))});
  }
  if(request.method==='DELETE') {
   const id=new URL(request.url).searchParams.get('id');
   if(!id)return reply({error:'Service ID is required.'},400);
   await recycleDeleteBatch(env.DB,[
    env.DB.prepare('DELETE FROM services WHERE id=?').bind(id),
    env.DB.prepare('INSERT INTO audit_logs(action,detail) VALUES (?,?)').bind('Delete',`Service ${id} deleted`)
   ],contextData.user);
   return reply({data:{id}});
  }
  if(!['POST','PUT'].includes(request.method))return reply({error:'Method not allowed.'},405);
  let body;
  try {body=await request.json()}catch{return reply({error:'Invalid JSON.'},400)}
  const id=String(body.id||`BD-SVC-${crypto.randomUUID()}`);
  const existing=await env.DB.prepare('SELECT data FROM services WHERE id=?').bind(id).first();
  if(request.method==='PUT'&&!existing)return reply({error:'Service no longer exists. Refresh the list.'},404);
  if(request.method==='POST'&&existing)return reply({error:'Service ID already exists.'},409);
  const record={...(existing?JSON.parse(existing.data):{}),...body,id};
  record.name=String(record.name||'').trim();
  record.charge=Number(record.charge);
  if(!record.name)return reply({error:'Service name is required.'},400);
  if(!Number.isFinite(record.charge)||record.charge<0)return reply({error:'Labour charge must be zero or greater.'},400);
  if(record.gst!==undefined){record.gst=Number(record.gst);if(!Number.isFinite(record.gst)||record.gst<0||record.gst>100)return reply({error:'GST must be between 0 and 100.'},400)}
  await env.DB.batch([
   env.DB.prepare('INSERT INTO services(id,name,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,data=excluded.data,updated_at=CURRENT_TIMESTAMP').bind(id,record.name,JSON.stringify(record)),
   env.DB.prepare('INSERT INTO audit_logs(action,detail) VALUES (?,?)').bind(request.method==='POST'?'Create':'Update',`Service ${id} saved`)
  ]);
  return reply({data:record},request.method==='POST'?201:200);
 }catch(error){console.error('Service API failed',error);return reply({error:'Service database request failed. Please try again.'},500)}
}

