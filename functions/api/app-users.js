import {hex,hashPassword,publicUser,identity} from '../app-identity.js';
// During rollout this endpoint is protected by the existing owner middleware.
// The application-wide login cutover must replace that guard with Admin identity.
export async function onRequest({request,env}){
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
 try{
  const actor=await identity(request,env.DB);
  if(!actor)return reply({error:'Sign in to continue.'},401);
  if(actor.role!=='Admin'||actor.status!=='Active')return reply({error:'Only administrators can manage users and passwords.'},403);
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
  if(request.method==='GET'){
   const result=await env.DB.prepare('SELECT * FROM app_users ORDER BY username').all();
   return reply({data:result.results.map(publicUser)});
  }
  if(!['POST','PUT'].includes(request.method))return reply({error:'Method not allowed.'},405);
  const body=await request.json();
  const existing=request.method==='PUT'?await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(String(body.id||'')).first():null;
  if(request.method==='PUT'&&!existing)return reply({error:'User does not exist.'},404);
  const username=String(body.username||'').trim(),name=String(body.name||'').trim(),password=String(body.password||'');
  if(!username||username.length>200||!name||name.length>200||((!existing||password)&&password.length<4)||password.length>256||!['Admin','Manager','Mechanic','User'].includes(body.role))return reply({error:'Complete user details and choose a password of 4–256 characters.'},400);
  if(existing?.id==='primary-admin'&&(body.role!=='Admin'||body.status==='Inactive'))return reply({error:'The primary administrator must remain active.'},400);
  const map=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(actions=>actions&&typeof actions==='object'&&!Array.isArray(actions)&&Object.values(actions).every(flag=>typeof flag==='boolean'));
  if(!map(body.permissions||{})||!map(body.actionRestrictions||{}))return reply({error:'Invalid permissions.'},400);
  const admin=body.role==='Admin';
  body.permissions={...(body.permissions||{}),users:{read:admin,write:admin,edit:admin,delete:admin}};
  if(existing){
   const duplicate=await env.DB.prepare('SELECT id FROM app_users WHERE username=? COLLATE NOCASE AND id<>?').bind(username,existing.id).first();
   if(duplicate)return reply({error:'Username already exists.'},409);
   const salt=password?hex(crypto.getRandomValues(new Uint8Array(32))):existing.salt;
   const hash=password?await hashPassword(password,salt):existing.password_hash;
   await env.DB.prepare('UPDATE app_users SET username=?,name=?,role=?,status=?,permissions=?,action_restrictions=?,salt=?,password_hash=?,credential_version=credential_version+?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(username,name,body.role,body.status==='Inactive'?'Inactive':'Active',JSON.stringify(body.permissions||{}),JSON.stringify(body.actionRestrictions||{}),salt,hash,password?1:0,existing.id).run();
   return reply({data:publicUser(await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(existing.id).first())});
  }
  const salt=hex(crypto.getRandomValues(new Uint8Array(32))),id=crypto.randomUUID();
  const inserted=await env.DB.prepare('INSERT OR IGNORE INTO app_users(id,username,name,role,salt,password_hash,permissions,action_restrictions) VALUES (?,?,?,?,?,?,?,?)').bind(id,username,name,body.role,salt,await hashPassword(password,salt),JSON.stringify(body.permissions||{}),JSON.stringify(body.actionRestrictions||{})).run();
  if(!inserted.meta.changes)return reply({error:'Username already exists.'},409);
  return reply({data:publicUser(await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(id).first())},201);
 }catch{return reply({error:'User management is not ready.'},503)}
}
