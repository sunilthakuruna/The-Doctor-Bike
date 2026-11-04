export async function onRequestGet({env,request}){
 const headers={'cache-control':'no-store'};
 const before=new URL(request.url).searchParams.get('before');
 if(before!==null&&(!/^\d+$/.test(before)||!Number.isSafeInteger(Number(before))))return Response.json({error:'Invalid page.'},{status:400,headers});
 try{
  const query=before===null
   ?env.DB.prepare('SELECT id,action,detail,actor,created_at FROM audit_logs ORDER BY id DESC LIMIT 51')
   :env.DB.prepare('SELECT id,action,detail,actor,created_at FROM audit_logs WHERE id<? ORDER BY id DESC LIMIT 51').bind(Number(before));
  const {results}=await query.all();
  return Response.json({data:results.slice(0,50),next:results.length>50?results[49].id:null},{headers});
 }catch(error){
  console.error('Audit log read failed',error);
  return Response.json({error:'Cloud audit history is unavailable.'},{status:500,headers});
 }
}
