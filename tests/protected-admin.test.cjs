const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('only primary account stays protected; other admin usernames remain editable',()=>{
 const users=[{id:'primary-admin',username:'owner@email'},{id:'uuid-admin',username:'admin'},{id:'other',username:'manager',role:'Admin'}];let deleted=0;
 const context={find:(_,id)=>users.find(u=>u.id===id),deleteRecord(){deleted++},actions:(_,id)=>'<div><button data-edit="users|'+id+'">Edit</button><button data-delete="users|'+id+'">Delete</button></div>',toast(){},document:{addEventListener(){}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../dist/protected-admin.js','utf8'),context);
 for(const id of ['primary-admin']){context.deleteRecord('users',id);assert.match(context.actions('users',id),/disabled aria-disabled="true"/);assert.match(context.actions('users',id),/data-edit/)}
 assert.equal(deleted,0);context.deleteRecord('users','uuid-admin');assert.equal(deleted,1);assert.doesNotMatch(context.actions('users','uuid-admin'),/disabled/);
});
test('server rejects changes to primary name, user ID, role or active status',async()=>{
 const {onRequest}=await import('../functions/api/app-users.js');
 for(const existing of [{id:'primary-admin',username:'owner@email',name:'Administrator'}])for(const change of [{username:'renamed'},{name:'Renamed owner'},{role:'User'},{status:'Inactive'}]){
  const DB={prepare(sql){const q={bind(){return q},async first(){if(sql.includes('JOIN app_users'))return {id:'actor',role:'Admin',status:'Active'};if(sql==='SELECT * FROM app_users WHERE id=?')return existing;throw Error('Unexpected query')},async run(){throw Error('Protected user must not be written')}};return q}};
  const response=await onRequest({env:{DB},request:new Request('https://test.invalid/api/app-users',{method:'PUT',headers:{origin:'https://test.invalid',cookie:'__Host-app=token','content-type':'application/json'},body:JSON.stringify({id:existing.id,username:existing.username,name:'Administrator',role:'Admin',status:'Active',...change})})});
  assert.ok([400,403].includes(response.status),await response.text());
 }
});
