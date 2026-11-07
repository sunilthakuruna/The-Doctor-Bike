import {recycleDeleteBatch} from '../recycle-store.js';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});

function expenseRecord(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const {id,date}=input;
 const fields=['category','mode','account','staff','description','salaryPaymentType'];
 const values=Object.fromEntries(fields.map(key=>[key,String(input[key]??'').trim()]));
 const amount=Number(input.amount);
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||typeof date!=='string'||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||
    !values.category||!values.mode||!values.account||!Number.isFinite(amount)||amount<=0||
    fields.some(key=>values[key].length>4000))return null;
 if(['Salary','Staff Salary / Advance'].includes(values.category)){
  if(!values.staff||!['','advance','salary'].includes(values.salaryPaymentType))return null;
 }else{
  values.staff='';
  values.salaryPaymentType='';
 }
 return {id,date,amount,...values};
}

export async function onRequest({request,env,data:contextData={}}){
 const db=env.DB;
 try{
  await db.prepare('CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, data TEXT NOT NULL)').run();
  if(request.method==='GET'){
   const {results}=await db.prepare('SELECT data FROM expenses ORDER BY id').all();
   return reply({data:results.map(row=>JSON.parse(row.data))});
  }
  if(request.method==='DELETE'){
   const id=new URL(request.url).searchParams.get('id');
   if(!id)return reply({error:'Expense ID is required.'},400);
   const [,result]=await recycleDeleteBatch(db,[
    db.prepare("INSERT INTO audit_logs(action,detail,actor) SELECT 'Delete',?,'Owner' FROM expenses WHERE id=?").bind('Expense '+id+' removed',id),
    db.prepare('DELETE FROM expenses WHERE id=?').bind(id)
   ],contextData.user);
   return result.meta.changes?reply({data:{id}}):reply({error:'Expense no longer exists.'},404);
  }
  const creating=request.method==='POST';
  if(!creating&&request.method!=='PUT')return reply({error:'Method not allowed.'},405);
  let body;
  try{body=await request.json()}catch{return reply({error:'Invalid JSON.'},400)}
  const importing=creating&&Array.isArray(body);
  const records=(importing?body:[body]).map(expenseRecord);
  if(!records.length||records.length>1000||records.some(record=>!record))return reply({error:'Check the expense ID, date, amount, payment account and salary details.'},400);
  if(new Set(records.map(record=>record.id)).size!==records.length)return reply({error:'The import contains duplicate expense IDs.'},409);
  const statements=records.map(record=>creating
   ?db.prepare('INSERT INTO expenses(id,data) VALUES (?,?)').bind(record.id,JSON.stringify(record))
   :db.prepare('UPDATE expenses SET data=? WHERE id=?').bind(JSON.stringify(record),record.id));
  const detail=importing?'Imported '+records.length+' expenses':'Expense '+records[0].id+' saved';
  statements.push(db.prepare('INSERT INTO audit_logs(action,detail,actor) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM expenses WHERE id=?)')
   .bind(creating?'Create':'Update',detail,'Owner',records[0].id));
  let results;
  try{results=await db.batch(statements)}
  catch(error){
   if(creating&&/UNIQUE constraint failed: expenses\.id/i.test(String(error)))return reply({error:'An expense ID is already in use. Refresh before trying again.'},409);
   throw error;
  }
  if(!results[0].meta.changes)return reply({error:'Expense no longer exists. Refresh the list.'},404);
  return reply({data:importing?records:records[0]},creating?201:200);
 }catch(error){
  console.error('Expense database request failed',error);
  return reply({error:'Expense database request failed.'},500);
 }
}
