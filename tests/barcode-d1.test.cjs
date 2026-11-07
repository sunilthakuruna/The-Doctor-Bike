const {test}=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const admin={id:'test-admin',username:'test',role:'Admin',status:'Active'};
const part={id:'part-1',name:'Oil filter',hsn:'8421',barcode:'0012345678905',opening:0};
test('barcode and HSN validation preserves legacy bills but rejects duplicate identities',async()=>{
 const {validatePartBarcodes:validate}=await import('../functions/part-barcodes.js');
 assert.doesNotThrow(()=>validate({parts:[{id:'old',name:'Legacy',opening:5}]},{parts:[{id:'old',name:'Legacy',opening:5,price:200}]}));
 assert.doesNotThrow(()=>validate({parts:[]},{parts:[{...part,hsn:''}]}));
 assert.doesNotThrow(()=>validate({parts:[part]},{parts:[{...part,hsn:'',brand:'Updated brand'}]}));
 assert.throws(()=>validate({parts:[part]},{parts:[part,{...part,id:'part-2'}]}),/already assigned/);
 assert.throws(()=>validate({parts:[]},{parts:[{...part,barcode:12345}]}),/text/);
 assert.doesNotThrow(()=>validate({parts:[]},{parts:[{...part,barcode:''},{...part,id:'part-2',barcode:''}]}));
 assert.throws(()=>validate({parts:[part]},{parts:[part,{...part,id:'restored'}]},{requireHsn:false}),/already assigned/);
});
test('D1-compatible inventory API retains barcode on reload and atomically rejects duplicates and stale writes',async()=>{
 const {onRequest}=await import('../functions/api/inventory.js');
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE audit_logs(id INTEGER PRIMARY KEY,action TEXT,detail TEXT,actor TEXT)');
 const db={
  prepare(sql){
   const stmt=sqlite.prepare(sql);let values=[];
   const query={
    bind(...args){values=args;return query},
    async first(){return stmt.get(...values)||null},
    async all(){return {results:stmt.all(...values)}},
    async run(){
     if(stmt.columns().length)stmt.all(...values);else stmt.run(...values);
     return {meta:{changes:Number(sqlite.prepare('SELECT changes() AS n').get().n)}};
    }
   };return query;
  },
  async batch(statements){
   sqlite.exec('BEGIN');
   try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results}
   catch(error){sqlite.exec('ROLLBACK');throw error}
  }
 };

 const data={parts:[part],jobs:[],sales:[],purchases:[],stockMovements:[],receipts:[],appointments:[],trash:[]};
 const call=body=>onRequest({env:{DB:db},data:{user:admin},request:new Request('https://test.invalid/api/inventory',body?{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
 try{
  const saved=await call({data,version:null});assert.equal(saved.status,200);const {version}=await saved.json();
  const reloaded=await (await call()).json();assert.equal(reloaded.data.parts[0].barcode,'0012345678905');assert.equal(reloaded.data.parts[0].hsn,'8421');
  assert.equal((await call({data:{...data,parts:[part,{...part,id:'part-2'}]},version})).status,403);
  const unchanged=await (await call()).json();assert.equal(unchanged.version,version);assert.equal(unchanged.data.parts.length,1);
  assert.equal((await call({data:{...data,parts:[{...part,barcode:'0098765'}]},version})).status,200);
  assert.equal((await call({data,version})).status,409);
 }finally{sqlite.close()}
});
