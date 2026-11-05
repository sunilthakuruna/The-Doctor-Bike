import {digest,hex,hashPassword,identity,publicUser} from '../app-identity.js';
const reply=(data,status=200,cookie)=>Response.json(data,{status,headers:{'cache-control':'no-store',...(cookie?{'set-cookie':cookie}:{})}});
export async function onRequest({request,env}){
 try{
  if(request.method==='GET'){
   const user=await identity(request,env.DB);
   return reply({authenticated:!!user,user:user?publicUser(user):null});
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
  if(request.method==='DELETE'){
   const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-app='))?.slice(11);
   if(token)await env.DB.prepare('UPDATE app_sessions SET revoked_at=? WHERE token_hash=?').bind(Date.now(),await digest(token)).run();
   return reply({ok:true},200,'__Host-app=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0');
  }
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
  const now=Date.now(),key='app:'+await digest(request.headers.get('cf-connecting-ip')||'unknown');
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS owner_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
  await env.DB.prepare('INSERT INTO owner_attempts(key,attempts,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END').bind(key,now+900000,now,now).run();
  const attempt=await env.DB.prepare('SELECT attempts FROM owner_attempts WHERE key=?').bind(key).first();
  if(attempt.attempts>10)return reply({error:'Try again in 15 minutes.'},429);
  const body=await request.json(),username=String(body.username||'').trim(),password=String(body.password||'');
  if(!username||username.length>200||password.length<12||password.length>256)return reply({error:'Enter your username and password (at least 12 characters).'},400);
  const user=await env.DB.prepare('SELECT * FROM app_users WHERE username=? COLLATE NOCASE').bind(username).first();
  // Use the same expensive calculation even for an unknown account.
  const hash=await hashPassword(password,user?.salt||'unknown-account-placeholder');
  if(!user||user.status!=='Active'||hash!==user.password_hash)return reply({error:'Incorrect username or password.'},401);
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
   env.DB.prepare('INSERT INTO app_sessions(token_hash,user_id,credential_version,created_at,last_used_at,expires_at) VALUES (?,?,?,?,?,?)').bind(await digest(token),user.id,user.credential_version,now,now,now+2592000000),
   env.DB.prepare('DELETE FROM owner_attempts WHERE key=?').bind(key)
  ]);
  return reply({authenticated:true,user:publicUser(user)},200,`__Host-app=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000`);
 }catch{return reply({error:'App sign-in is not ready. Contact the administrator.'},503)}
}
