const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('session checking displays a loading status without a login form',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../dist/user-signin-signout.js'),'utf8');
 const code=source.slice(source.indexOf('function showSessionLoading()'),source.indexOf('function signOut()'));
 let gate=null,created=0;const context={$:()=>gate,document:{createElement(){created++;return {hidden:true,innerHTML:''}},body:{appendChild(node){gate=node}}}};
 vm.createContext(context);vm.runInContext(code+'showSessionLoading()',context);
 assert.equal(gate.hidden,false);assert.match(gate.innerHTML,/role="status"/);assert.doesNotMatch(gate.innerHTML,/<form|password|Sign In/);
 vm.runInContext('showSessionLoading()',context);assert.equal(created,1);
 assert.match(source,/if\(!activeUser\)showSessionLoading\(\)/);
});
