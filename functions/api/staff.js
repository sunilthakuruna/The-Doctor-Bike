const attachments = ['photo', 'aadhaarDocument', 'drivingLicenseDocument'];
const fields = ['name','mobile','designation','skills','experience','address','aadhaar','drivingLicense','joining','salaryType','salary','status','emergency','remarks'];
const reply = (body, status=200) => Response.json(body, {status, headers:{'cache-control':'no-store'}});

export async function onRequest({request, env}) {
 const db=env.DB;
 try {
  await db.batch([
   db.prepare('CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, data TEXT NOT NULL)'),
   db.prepare('CREATE TABLE IF NOT EXISTS staff_attachments (staff_id TEXT NOT NULL, field TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(staff_id,field), FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE)')
  ]);
  if(request.method==='GET'){
   const [staff, files]=await db.batch([db.prepare('SELECT id,data FROM staff ORDER BY id'),db.prepare('SELECT staff_id,field,data FROM staff_attachments')]);
   const records=new Map(staff.results.map(row=>[row.id,JSON.parse(row.data)]));
   for(const file of files.results) if(records.has(file.staff_id)) records.get(file.staff_id)[file.field]=file.data;
   return reply({data:[...records.values()]});
  }
  const deleting=request.method==='DELETE';
  const creating=request.method==='POST';
  if(!deleting&&!creating&&request.method!=='PUT')return reply({error:'Method not allowed.'},405);
  let body={};
  if(!deleting){
   try {body=await request.json()} catch {return reply({error:'Invalid JSON.'},400)}
   if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Invalid staff record.'},400);
  }
  const id=deleting?new URL(request.url).searchParams.get('id'):creating?'BD-STF-'+crypto.randomUUID():body.id;
  if(typeof id!=='string'||!id||id.length>100)return reply({error:'Invalid staff ID.'},400);
  if(deleting){
   await db.batch([
    db.prepare('INSERT INTO audit_logs(action,detail,actor) SELECT ?,?,? FROM staff WHERE id=?').bind('Delete','Staff '+id,'Owner',id),
    db.prepare('DELETE FROM staff WHERE id=?').bind(id)
   ]);
   return reply({data:{id}});
  }
  const record={id};
  for(const field of fields) record[field]=String(body[field]??'').trim();
  if(!record.name||!record.mobile||!record.designation||fields.some(field=>record[field].length>4000))return reply({error:'Check the name, mobile number, designation and field lengths.'},400);
  record.salary=Number(record.salary);
  record.experience=Number(record.experience);
  if(!Number.isFinite(record.experience)||record.experience<0||!Number.isFinite(record.salary)||record.salary<0||(record.salaryType==='Per Job'&&record.salary>100))return reply({error:'Enter valid experience and salary values.'},400);
  const statements=[creating?db.prepare('INSERT INTO staff(id,data) VALUES (?,?)').bind(id,JSON.stringify(record)):db.prepare('UPDATE staff SET data=? WHERE id=?').bind(JSON.stringify(record),id)];
  for(const field of attachments){
   if(!Object.hasOwn(body,field))continue;
   const value=body[field];
   if(typeof value!=='string'||value.length>1450000)return reply({error:'An attachment is too large. Choose a smaller file.'},400);
   record[field]=value;
   statements.push(value?
    db.prepare('INSERT INTO staff_attachments(staff_id,field,data) SELECT id,?,? FROM staff WHERE id=? ON CONFLICT(staff_id,field) DO UPDATE SET data=excluded.data').bind(field,value,id):
    db.prepare('DELETE FROM staff_attachments WHERE staff_id=? AND field=?').bind(id,field));
  }
  statements.push(db.prepare('INSERT INTO audit_logs(action,detail,actor) SELECT ?,?,? FROM staff WHERE id=?').bind(creating?'Create':'Update','Staff '+id,'Owner',id));
  const [result]=await db.batch(statements);
  return result.meta.changes?reply({data:record},creating?201:200):reply({error:'Staff record no longer exists.'},404);
 } catch(error){
  console.error('Staff database request failed',error);
  return reply({error:'Staff database request failed.'},500);
 }
}
