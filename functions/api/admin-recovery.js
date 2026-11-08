import {digest,hex,hashPassword,identity} from '../app-identity.js';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const normalize=code=>String(code||'').replace(/[\s-]/g,'').toLowerCase();
const newCode=()=>hex(crypto.getRandomValues(new Uint8Array(32))).match(/.{1,8}/g).join('-');
export async function onRequest({request,env}){
 if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
 try{
  const body=await request.json();
  if(!['generate','recover'].includes(body.action))return reply({error:'Invalid recovery action.'},400);
  const now=Date.now(),key=await digest(request.headers.get('cf-connecting-ip')||'unknown');
  await env.DB.prepare('INSERT INTO app_recovery_attempts(key,attempts,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END').bind(key,now+900000,now,now).run();
  const attempt=await env.DB.prepare('SELECT attempts FROM app_recovery_attempts WHERE key=?').bind(key).first();
  if(attempt.attempts>5)return reply({error:'Too many recovery attempts. Try again in 15 minutes.'},429);
  let user;
  if(body.action==='generate'){
   user=await identity(request,env.DB);
   if(!user||user.role!=='Admin'||user.status!=='Active')return reply({error:'An active administrator must sign in to generate a recovery code.'},403);
   if(typeof body.password!=='string'||body.password.length>256||await hashPassword(body.password,user.salt)!==user.password_hash)return reply({error:'Incorrect current password.'},403);
  }else{
   if(typeof body.username!=='string'||body.username.length>200||typeof body.newPassword!=='string'||body.newPassword.length<4||body.newPassword.length>256||!/^[a-f0-9]{64}$/.test(normalize(body.code)))return reply({error:'Enter your administrator username, recovery code and a new password of 4–256 characters.'},400);
   user=await env.DB.prepare('SELECT * FROM app_users WHERE username=? COLLATE NOCASE').bind(body.username.trim()).first();
   if(!user||user.role!=='Admin'||user.status!=='Active')return reply({error:'Invalid administrator username or recovery code.'},403);
  }
  const code=newCode(),codeHash=await digest(normalize(code));
  if(body.action==='generate'){
   const result=await env.DB.prepare('INSERT INTO app_admin_recovery(user_id,code_hash,credential_version) SELECT id,?,credential_version FROM app_users WHERE id=? AND credential_version=? AND role=? AND status=? ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,credential_version=excluded.credential_version,created_at=CURRENT_TIMESTAMP').bind(codeHash,user.id,user.credential_version,'Admin','Active').run();
   if(!result.meta.changes)return reply({error:'Your account changed. Sign in again.'},409);
  }else{
   const oldHash=await digest(normalize(body.code)),salt=hex(crypto.getRandomValues(new Uint8Array(32))),hash=await hashPassword(body.newPassword,salt);
   const statements=[
    env.DB.prepare('UPDATE app_users SET salt=?,password_hash=?,password_iterations=100000,credential_version=credential_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND role=? AND status=? AND EXISTS (SELECT 1 FROM app_admin_recovery r WHERE r.user_id=app_users.id AND r.code_hash=? AND r.credential_version=app_users.credential_version)').bind(salt,hash,user.id,'Admin','Active',oldHash),
    env.DB.prepare('UPDATE app_admin_recovery SET code_hash=?,credential_version=(SELECT credential_version FROM app_users WHERE id=?),created_at=CURRENT_TIMESTAMP WHERE user_id=? AND code_hash=? AND EXISTS (SELECT 1 FROM app_users WHERE id=? AND salt=?)').bind(codeHash,user.id,user.id,oldHash,user.id,salt)
   ];
   if(user.id==='primary-admin')statements.push(
    env.DB.prepare('UPDATE owner_account SET salt=?,password_hash=? WHERE id=1 AND EXISTS (SELECT 1 FROM app_users WHERE id=? AND salt=?)').bind(salt,hash,user.id,salt),
    env.DB.prepare('DELETE FROM owner_sessions WHERE EXISTS (SELECT 1 FROM app_users WHERE id=? AND salt=?)').bind(user.id,salt)
   );
   const results=await env.DB.batch(statements);
   if(!results[0].meta.changes)return reply({error:'Invalid administrator username or recovery code.'},403);
  }
  // Credential version invalidates all old server sessions and the previous recovery code.
  return reply({ok:true,username:user.username,code});
 }catch{return reply({error:'Recovery is unavailable. Apply the administrator recovery database migration and try again online.'},503)}
}
