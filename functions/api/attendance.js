const statuses=new Set(['Unmarked','Present','Half Day','Absent','Paid Leave','Weekly Off']);
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});

export async function onRequest({request,env}){
 const db=env.DB;
 try{
  await db.prepare('CREATE TABLE IF NOT EXISTS attendance_days (day TEXT PRIMARY KEY, records TEXT NOT NULL, version TEXT NOT NULL)').run();
  if(request.method==='GET'){
   const {results}=await db.prepare('SELECT day,records,version FROM attendance_days').all();
   return reply({data:results.map(row=>({day:row.day,records:JSON.parse(row.records),version:row.version}))});
  }
  if(request.method!=='PUT')return reply({error:'Method not allowed.'},405);
  let body;
  try{body=await request.json()}catch{return reply({error:'Invalid JSON.'},400)}
  const {day,records,version}=body||{};
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day||
     !records||typeof records!=='object'||Array.isArray(records)||!Object.hasOwn(body,'version')||(version!==null&&typeof version!=='string'))
   return reply({error:'Invalid attendance date or records.'},400);
  const entries=Object.entries(records);
  if(entries.length>500||entries.some(([id,item])=>!/^BD-STF-[\w-]+$/.test(id)||id.length>100||!item||!statuses.has(item.status)||typeof item.note!=='string'||item.note.length>4000))
   return reply({error:'Check attendance marks and notes.'},400);
  const nextVersion=crypto.randomUUID();
  const data=JSON.stringify(Object.fromEntries(entries.map(([id,{status,note}])=>[id,{status,note}])));
  if(new TextEncoder().encode(data).length>1000000)return reply({error:'Attendance notes are too large.'},400);
  const change=version===null
   ?db.prepare('INSERT OR IGNORE INTO attendance_days(day,records,version) VALUES (?,?,?)').bind(day,data,nextVersion)
   :db.prepare('UPDATE attendance_days SET records=?,version=? WHERE day=? AND version=?').bind(data,nextVersion,day,version);
  const [result]=await db.batch([
   change,
   db.prepare("INSERT INTO audit_logs(action,detail,actor) SELECT 'Update',?,'Owner' FROM attendance_days WHERE day=? AND version=?").bind('Attendance saved for '+day,day,nextVersion)
  ]);
  if(!result.meta.changes)return reply({error:'Attendance changed in another session. Refresh before saving again.'},409);
  return reply({version:nextVersion,records:JSON.parse(data)});
 }catch(error){
  console.error('Attendance database request failed',error);
  return reply({error:'Attendance database request failed.'},500);
 }
}
