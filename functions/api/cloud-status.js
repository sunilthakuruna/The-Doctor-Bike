export async function onRequestGet({env}){
 const headers={'cache-control':'no-store'};
 try{
  const result=await env.DB.prepare('SELECT 1 AS connected').first();
  if(result?.connected!==1)throw new Error('Unexpected D1 probe result');
  return Response.json({database:'Cloudflare D1',connected:true},{headers});
 }catch{
  return Response.json({error:'Cloudflare D1 is unavailable.'},{status:503,headers});
 }
}
