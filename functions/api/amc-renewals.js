const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export async function onRequestPost({request,env}){
 let body;
 try{body=await request.json()}catch{return reply({error:'Invalid renewal.'},400)}
 const {id,previousExpiry,amcPlanId,amcType,amcStart,amcExpiry,amcRef}=body||{};
 if([id,amcPlanId,amcType].some(value=>typeof value!=='string'||!value.trim()||value.length>200)||
    typeof previousExpiry!=='string'||(previousExpiry&&!date(previousExpiry))||
    !date(amcStart)||!date(amcExpiry)||amcExpiry<amcStart||
    typeof amcRef!=='string'||amcRef.length>1000)return reply({error:'Check the AMC plan, reference, and validity dates.'},400);
 try{
  const db=env.DB;
  const token=crypto.randomUUID();
  const fields={amcPlanId,amcType,amcStart,amcExpiry,amcRef,amcScope:'vehicle',amcRenewalToken:token};
  const [updated]=await db.batch([
   db.prepare("UPDATE vehicles SET data=json_patch(data,?),updated_at=CURRENT_TIMESTAMP WHERE id=? AND COALESCE(json_extract(data,'$.amcExpiry'),'')=? RETURNING data")
    .bind(JSON.stringify(fields),id,previousExpiry),
   db.prepare("INSERT INTO audit_logs(action,detail,actor) SELECT 'AMC Renewal',?,'Owner' FROM vehicles WHERE id=? AND json_extract(data,'$.amcRenewalToken')=?")
    .bind(id+' renewed from '+(previousExpiry||'no expiry')+' to '+amcExpiry,id,token)
  ]);
  if(!updated.results.length)return reply({error:'Vehicle or AMC expiry changed. Refresh and review the renewal.'},409);
  return reply({data:JSON.parse(updated.results[0].data)});
 }catch(error){
  console.error('AMC renewal failed',error);
  return reply({error:'AMC renewal could not be saved.'},500);
 }
}
