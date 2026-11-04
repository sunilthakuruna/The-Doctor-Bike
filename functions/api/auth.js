const enc=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const digest=async text=>hex(await crypto.subtle.digest('SHA-256',enc.encode(text)));
const reply=(body,status=200,cookie)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store',...(cookie?{'set-cookie':cookie}:{})}});
async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:enc.encode(salt)},key,256));
}
export async function onRequest({request,env}){
 try{
  await env.DB.batch([
   env.DB.prepare('CREATE TABLE IF NOT EXISTS owner_account (id INTEGER PRIMARY KEY CHECK(id=1), email TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL)'),
   env.DB.prepare('CREATE TABLE IF NOT EXISTS owner_sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)'),
   env.DB.prepare('CREATE TABLE IF NOT EXISTS owner_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)')
  ]);
  const owner=await env.DB.prepare('SELECT * FROM owner_account WHERE id=1').first();
  const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-owner='))?.slice(13);
  if(request.method==='GET'){
   const session=token&&await env.DB.prepare('SELECT expires FROM owner_sessions WHERE token_hash=? AND expires>?').bind(await digest(token),Date.now()).first();
   return reply({configured:!!owner,authenticated:!!session});
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
  if(request.method==='DELETE'){
   if(token)await env.DB.prepare('DELETE FROM owner_sessions WHERE token_hash=?').bind(await digest(token)).run();
   return reply({ok:true},200,'__Host-owner=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0');
  }
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
  const key=await digest(request.headers.get('cf-connecting-ip')||'unknown');
  const now=Date.now();
  await env.DB.prepare('INSERT INTO owner_attempts(key,attempts,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END').bind(key,now+900000,now,now).run();
  const attempt=await env.DB.prepare('SELECT attempts FROM owner_attempts WHERE key=?').bind(key).first();
  if(attempt.attempts>10)return reply({error:'Too many attempts. Try again in 15 minutes.'},429);
  let body;try{body=await request.json()}catch{return reply({error:'Invalid request.'},400)}
  const email=String(body.email||'').trim().toLowerCase(), password=String(body.password||'');
  if(!email||password.length<12||password.length>256)return reply({error:'Enter your email and a password of 12–256 characters.'},400);
  if(!owner){
   if(!env.OWNER_SETUP_TOKEN||await digest(String(body.setupToken||''))!==await digest(env.OWNER_SETUP_TOKEN))return reply({error:'A valid owner setup token is required.'},403);
   const salt=hex(crypto.getRandomValues(new Uint8Array(32)));
   const inserted=await env.DB.prepare('INSERT OR IGNORE INTO owner_account(id,email,salt,password_hash) VALUES (1,?,?,?)').bind(email,salt,await passwordHash(password,salt)).run();
   if(!inserted.meta.changes)return reply({error:'Owner already configured. Please sign in.'},409);
  }else if(email!==owner.email||await passwordHash(password,owner.salt)!==owner.password_hash)return reply({error:'Incorrect email or password.'},401);
  const fresh=hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
   env.DB.prepare('DELETE FROM owner_sessions WHERE expires<?').bind(now),
   env.DB.prepare('INSERT INTO owner_sessions(token_hash,expires) VALUES (?,?)').bind(await digest(fresh),now+28800000),
   env.DB.prepare('DELETE FROM owner_attempts WHERE key=?').bind(key)
  ]);
  return reply({authenticated:true},200,`__Host-owner=${fresh}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=28800`);
 }catch(error){console.error('Owner authentication failed',error);return reply({error:'Sign-in service unavailable. Please try again.'},503)}
}
