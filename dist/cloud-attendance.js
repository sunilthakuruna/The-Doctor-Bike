(() => {
 const localAttendance=db.attendance;
 const saveWorkspace=save;
 save=function(...args){
  const current=db.attendance;
  db.attendance=localAttendance;
  try{return saveWorkspace.apply(this,args)}finally{db.attendance=current}
 };
 const versions=new Map();
 let saving=false;
 let loaded=false;
 (async()=>{
  if(!await window.BD_CLOUD_READY)return false;
  try{
   const response=await fetch('/api/attendance',{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw new Error();
   db.attendance=Object.fromEntries(result.data.map(row=>{
    versions.set(row.day,row.version);
    return [row.day,row.records];
   }).filter(([,records])=>Object.keys(records).length));
   for(const date of Object.keys(attendanceDailyDrafts))delete attendanceDailyDrafts[date];
   if(document.querySelector('#modal').hidden)render();
   loaded=true;
   return true;
  }catch{
   toast('Cloud attendance could not be loaded. Refresh to retry.');
   return false;
  }
 })();
 window.saveCloudAttendance=async(day,records)=>{
  if(!loaded){toast('Cloud attendance is unavailable. Refresh to retry.');return false}
  if(saving){toast('An attendance save is already in progress.');return false}
  saving=true;
  try{
   const response=await fetch('/api/attendance',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({day,records,version:versions.get(day)??null})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Attendance could not be saved.');
   versions.set(day,result.version);
   if(Object.keys(result.records).length)db.attendance[day]=result.records;
   else delete db.attendance[day];
   attendanceDailyDrafts[day]=structuredClone(result.records);
   toast('Attendance saved to Cloudflare D1.');
   return true;
  }catch(error){toast(error.message);return false}
  finally{saving=false}
 };
})();
