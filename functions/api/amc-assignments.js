const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value);
const validDate=value=>!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);

export async function onRequestPost({request,env}){
 let body;
 try{body=await request.json()}catch{return reply({error:'Invalid AMC assignment.'},400)}
 const {archiveId,customer,vehicle,fields}=body||{};
 if(!validId(customer)||!validId(vehicle)||!validId(archiveId)||
    (archiveId!=='LEGACY-AMC-'+customer&&!archiveId.startsWith('LEGACY-VEHICLE-AMC-'))||
    !fields||typeof fields!=='object')return reply({error:'Select a valid archived AMC and vehicle.'},400);
 const keys=['amcType','amcPlanId','amcStart','amcExpiry','amcRef','amcNotes'];
 if(keys.some(key=>typeof fields[key]!=='string'||fields[key].length>4000)||
    !fields.amcType.trim()||!validDate(fields.amcStart)||!validDate(fields.amcExpiry)||
    (fields.amcStart&&fields.amcExpiry&&fields.amcExpiry<fields.amcStart))return reply({error:'Check the archived AMC plan and dates.'},400);
 const data={...Object.fromEntries(keys.map(key=>[key,fields[key]])),amcScope:'vehicle'};
 const db=env.DB;
 try{
  await db.prepare('CREATE TABLE IF NOT EXISTS amc_archive_assignments (archive_id TEXT PRIMARY KEY, vehicle TEXT NOT NULL, token TEXT NOT NULL, assigned_at TEXT NOT NULL)').run();
  const token=crypto.randomUUID(),at=new Date().toISOString();
  const eligible="id=? AND customer=? AND COALESCE(json_extract(data,'$.amcType'),'')='' AND COALESCE(json_extract(data,'$.amcPlanId'),'')=''";
  const [,updated]=await db.batch([
   db.prepare(`INSERT OR IGNORE INTO amc_archive_assignments(archive_id,vehicle,token,assigned_at) SELECT ?,id,?,? FROM vehicles WHERE ${eligible}`)
    .bind(archiveId,token,at,vehicle,customer),
   db.prepare('UPDATE vehicles SET data=json_patch(data,?),updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS (SELECT 1 FROM amc_archive_assignments WHERE archive_id=? AND token=?) RETURNING data')
    .bind(JSON.stringify(data),vehicle,archiveId,token),
   db.prepare("INSERT INTO audit_logs(action,detail,actor) SELECT 'AMC Assignment',?,'Owner' FROM amc_archive_assignments WHERE archive_id=? AND token=?")
    .bind(archiveId+' assigned to '+vehicle,archiveId,token)
  ]);
  if(!updated.results.length)return reply({error:'The archive is already assigned, or the vehicle has coverage or belongs to another customer. Refresh and review.'},409);
  return reply({data:JSON.parse(updated.results[0].data),assignedAt:at});
 }catch(error){
  console.error('Archived AMC assignment failed',error);
  return reply({error:'Archived AMC could not be assigned.'},500);
 }
}
