const schema = `CREATE TABLE IF NOT EXISTS vehicles (
 id TEXT PRIMARY KEY, customer TEXT NOT NULL REFERENCES customers(id),
 number TEXT NOT NULL COLLATE NOCASE UNIQUE, data TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`;
const reply = (body, status=200) => new Response(JSON.stringify(body), {
 status, headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
export async function onRequest({request,env}) {
 try {
  // Idempotent bootstrap also supports dashboard deployments without Wrangler migrations.
  await env.DB.prepare(schema).run();
  if(request.method==='GET') {
   const rows=await env.DB.prepare('SELECT data FROM vehicles ORDER BY number').all();
   return reply({data:rows.results.map(row=>JSON.parse(row.data))});
  }
  if(request.method==='DELETE') {
   const id=new URL(request.url).searchParams.get('id');
   if(!id)return reply({error:'Vehicle ID is required.'},400);
   await env.DB.batch([
    env.DB.prepare('DELETE FROM vehicles WHERE id=?').bind(id),
    env.DB.prepare('INSERT INTO audit_logs(action,detail) VALUES (?,?)').bind('Delete',`Vehicle ${id} deleted`)
   ]);
   return reply({data:{id}});
  }
  if(!['POST','PUT'].includes(request.method))return reply({error:'Method not allowed.'},405);
  let body;
  try {body=await request.json()}catch{return reply({error:'Invalid JSON.'},400)}
  const id=String(body.id||`BD-VEH-${crypto.randomUUID()}`);
  const existing=await env.DB.prepare('SELECT data FROM vehicles WHERE id=?').bind(id).first();
  if(request.method==='PUT'&&!existing)return reply({error:'Vehicle no longer exists. Refresh the list.'},404);
  if(request.method==='POST'&&existing)return reply({error:'Vehicle ID already exists.'},409);
  const record={...(existing?JSON.parse(existing.data):{}),...body,id};
  record.number=String(record.number||'').trim().toUpperCase();
  record.customer=String(record.customer||'').trim();
  if(!record.number||!record.customer)return reply({error:'Customer and vehicle number are required.'},400);
  if(!await env.DB.prepare('SELECT id FROM customers WHERE id=?').bind(record.customer).first())return reply({error:'Save the customer to D1 before adding this vehicle.'},400);
  const duplicate=await env.DB.prepare('SELECT id FROM vehicles WHERE number=? AND id<>?').bind(record.number,id).first();
  if(duplicate)return reply({error:'This vehicle number already exists.'},409);
  await env.DB.batch([
   env.DB.prepare('INSERT INTO vehicles(id,customer,number,data) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET customer=excluded.customer,number=excluded.number,data=excluded.data,updated_at=CURRENT_TIMESTAMP').bind(id,record.customer,record.number,JSON.stringify(record)),
   env.DB.prepare('INSERT INTO audit_logs(action,detail) VALUES (?,?)').bind(request.method==='POST'?'Create':'Update',`Vehicle ${id} saved`)
  ]);
  return reply({data:record},request.method==='POST'?201:200);
 }catch(error){console.error('Vehicle API failed',error);return reply({error:'Vehicle database request failed. Please try again.'},500)}
}
