const types=new Set(['Cash in Hand','Bank Current Account','Bank Savings Account','UPI / Digital Wallet','Petty Cash','Other']);
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});

function accountRecord(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const {id,type,status='Active'}=input;
 const name=String(input.name??'').trim();
 const description=String(input.description??'').trim();
 const opening=Number(input.opening??0);
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||!name||name.length>200||
    !types.has(type)||!['Active','Inactive'].includes(status)||!Number.isFinite(opening)||description.length>4000)return null;
 return {id,name,type,opening,status,description};
}

export async function onRequest({request,env}){
 const db=env.DB;
 try{
  await db.prepare('CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, data TEXT NOT NULL)').run();
  if(request.method==='GET'){
   const {results}=await db.prepare('SELECT data FROM accounts ORDER BY id').all();
   return reply({data:results.map(row=>JSON.parse(row.data))});
  }
  const creating=request.method==='POST';
  if(!creating&&request.method!=='PUT')return reply({error:'Method not allowed.'},405);
  let body;
  try{body=await request.json()}catch{return reply({error:'Invalid JSON.'},400)}
  const importing=creating&&Array.isArray(body);
  const records=(importing?body:[body]).map(accountRecord);
  if(!records.length||records.length>1000||records.some(record=>!record))return reply({error:'Check the account ID, name, type, status and opening balance.'},400);
  if(new Set(records.map(record=>record.id)).size!==records.length)return reply({error:'The import contains duplicate account IDs.'},409);
  const statements=records.map(record=>creating
   ?db.prepare('INSERT INTO accounts(id,data) VALUES (?,?)').bind(record.id,JSON.stringify(record))
   :db.prepare('UPDATE accounts SET data=? WHERE id=?').bind(JSON.stringify(record),record.id));
  const detail=importing?'Imported '+records.length+' accounts':'Account '+records[0].id+' saved';
  statements.push(db.prepare('INSERT INTO audit_logs(action,detail,actor) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM accounts WHERE id=?)')
   .bind(creating?'Create':'Update',detail,'Owner',records[0].id));
  let results;
  try{results=await db.batch(statements)}
  catch(error){
   if(creating&&/UNIQUE constraint failed: accounts\.id/i.test(String(error)))return reply({error:'An account ID is already in use. Refresh before trying again.'},409);
   throw error;
  }
  if(!results[0].meta.changes)return reply({error:'Account no longer exists. Refresh the list.'},404);
  return reply({data:importing?records:records[0]},creating?201:200);
 }catch(error){
  console.error('Account database request failed',error);
  return reply({error:'Account database request failed.'},500);
 }
}
