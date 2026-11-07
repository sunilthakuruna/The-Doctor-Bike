// Read authoritative D1 records, including modules not visible to the caller.
export async function deletionDependencies(db,key,id){
 const tables=new Set((await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(row=>row.name));
 async function snapshot(scope){
  if(!tables.has(scope+'_head')||!tables.has(scope+'_chunks'))return {};
  const rows=await db.prepare(`SELECT c.data FROM ${scope}_head h JOIN ${scope}_chunks c ON c.version=h.version ORDER BY c.position`).all();
  return rows.results.length?JSON.parse(rows.results.map(row=>row.data).join('')):{};
 }
 const inventory=await snapshot('inventory'),insurance=await snapshot('insurance'),links=[];
 const add=(records,module,label,match)=>{for(const record of records||[])if(match(record))links.push({module,id:record.id,label,detail:record.number||record.name||''})};
 if(key==='customers'){
  if(tables.has('vehicles')){
   const vehicles=await db.prepare('SELECT id,number FROM vehicles WHERE customer=?').bind(id).all();
   add(vehicles.results,'bikes','Vehicle',()=>true);
  }
  add(inventory.jobs,'jobs','Job Card',r=>r.customer===id);
  add(inventory.sales,'sales','Spare Parts Sale',r=>r.customer===id);
  add(insurance.insurance,'insurance','Insurance',r=>r.customer===id);
 }
 if(key==='bikes'){
  add(inventory.jobs,'jobs','Job Card',r=>r.bike===id);
  add(insurance.insurance,'insurance','Insurance',r=>r.bike===id);
 }
 return links;
}
