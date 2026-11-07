import {identity} from '../app-identity.js';
import {permitted} from '../app-permissions.js';
export async function onRequest(context) {
 const {request,env}=context;
 const path=new URL(request.url).pathname;
 if(path==='/api/auth'||path==='/api/app-auth')return context.next();
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==new URL(request.url).origin)
  return Response.json({error:'Invalid request origin.'},{status:403});
 try {
  let user;
  try{user=await identity(request,env.DB)}catch{user=null}
  if(user){
   if(!permitted(user,path,request.method))return Response.json({error:'Access is not granted for your account.'},{status:403});
   context.data.user=user;
   return context.next();
  }
  const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-owner='))?.slice(13);
  if(!token)return Response.json({error:'Owner sign-in required.'},{status:401});
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
  const session=await env.DB.prepare('SELECT expires FROM owner_sessions WHERE token_hash=? AND expires>?').bind(hash,Date.now()).first();
  if(!session)return Response.json({error:'Please sign in again.'},{status:401});
  context.data.user={id:'legacy-owner',role:'Admin',status:'Active'};
  return context.next();
 }catch{return Response.json({error:'Owner login is not configured.'},{status:503})}
}
