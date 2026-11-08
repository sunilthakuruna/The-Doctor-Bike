const {test}=require('node:test'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite'),fs=require('node:fs');
async function setup(){
 const {hashPassword,digest}=await import('../functions/app-identity.js'),{onRequest}=await import('../functions/api/admin-recovery.js');
 const sql=new DatabaseSync(':memory:');
 sql.exec(fs.readFileSync(__dirname+'/../migrations/0002_app_auth.sql','utf8').split('-- Preserve')[0]);
 sql.exec(fs.readFileSync(__dirname+'/../migrations/0004_admin_recovery.sql','utf8'));
 sql.exec('CREATE TABLE owner_account(id INTEGER PRIMARY KEY,salt TEXT,password_hash TEXT);CREATE TABLE owner_sessions(token_hash TEXT PRIMARY KEY,expires INTEGER);');
 const hash=await hashPassword('old-password','salt');
 sql.prepare('INSERT INTO app_users(id,username,name,role,salt,password_hash) VALUES (?,?,?,?,?,?)').run('primary-admin','admin','Admin','Admin','salt',hash);
 sql.prepare('INSERT INTO app_users(id,username,name,role,salt,password_hash) VALUES (?,?,?,?,?,?)').run('regular','user','User','User','salt',hash);
 sql.prepare('INSERT INTO owner_account VALUES (1,?,?)').run('salt',hash);
 for(const [id,token]of [['primary-admin','admin-token'],['regular','user-token']])sql.prepare('INSERT INTO app_sessions(token_hash,user_id,credential_version,created_at,last_used_at,expires_at) VALUES (?,?,1,0,0,?)').run(await digest(token),id,Date.now()+600000);
 const DB={prepare(text){const statement=sql.prepare(text);let args=[];const q={bind(...v){args=v;return q},async first(){return statement.get(...args)||null},async run(){const result=statement.run(...args);return {meta:{changes:Number(result.changes)}}}};return q},async batch(queries){sql.exec('BEGIN');try{const result=[];for(const q of queries)result.push(await q.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 let ip=0;
 const call=(body,token='',origin='https://garage.test',fixedIp)=>onRequest({env:{DB},request:new Request('https://garage.test/api/admin-recovery',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':fixedIp||String(++ip),cookie:'__Host-app='+token},body:JSON.stringify(body)})});
 return {sql,DB,call,hashPassword};
}
test('only authenticated admin with current password can issue a private code',async()=>{
 const s=await setup();
 assert.equal((await s.call({action:'generate',password:'old-password'},'user-token')).status,403);
 assert.equal((await s.call({action:'generate',password:'wrong'},'admin-token')).status,403);
 assert.equal((await s.call({action:'generate',password:'old-password'},'admin-token','https://evil.test')).status,403);
 const result=await(await s.call({action:'generate',password:'old-password'},'admin-token')).json();
 assert.equal(result.code.replaceAll('-','').length,64);assert.notEqual(s.sql.prepare('SELECT code_hash FROM app_admin_recovery').get().code_hash,result.code.replaceAll('-',''));
});
test('recovery rotates code, changes password, invalidates sessions and rejects code reuse',async()=>{
 const s=await setup(),{identity}=await import('../functions/app-identity.js');
 const code=(await(await s.call({action:'generate',password:'old-password'},'admin-token')).json()).code;
 const recovery={action:'recover',username:'admin',code,newPassword:'5678'};
 const response=await s.call(recovery);assert.equal(response.status,200);const replacement=await response.json();assert.notEqual(replacement.code,code);
 const user=s.sql.prepare('SELECT * FROM app_users WHERE id=?').get('primary-admin');assert.equal(user.password_hash,await s.hashPassword('5678',user.salt));
 assert.equal(await identity(new Request('https://garage.test',{headers:{cookie:'__Host-app=admin-token'}}),s.DB),null);
 assert.equal((await s.call(recovery)).status,403);
 assert.equal((await s.call({...recovery,code:replacement.code,newPassword:'9012'})).status,200);
});
test('regeneration invalidates old code; failed recovery cannot alter password; attempts are limited',async()=>{
 const s=await setup();
 const first=(await(await s.call({action:'generate',password:'old-password'},'admin-token')).json()).code;
 await s.call({action:'generate',password:'old-password'},'admin-token');
 const before=s.sql.prepare('SELECT password_hash FROM app_users WHERE id=?').get('primary-admin').password_hash;
 assert.equal((await s.call({action:'recover',username:'admin',code:first,newPassword:'1234'})).status,403);
 assert.equal(s.sql.prepare('SELECT password_hash FROM app_users WHERE id=?').get('primary-admin').password_hash,before);
 for(let i=0;i<5;i++)await s.call({action:'recover',username:'admin',code:first,newPassword:'1234'},'','https://garage.test','limited');
 assert.equal((await s.call({action:'recover',username:'admin',code:first,newPassword:'1234'},'','https://garage.test','limited')).status,429);
});
