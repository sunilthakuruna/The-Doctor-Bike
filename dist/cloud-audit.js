(() => {
 let rows=[],next=null,loading=false,error='',loaded=false;
 const prior=auditPage;
 auditPage=function(){
  const list=table(['Date / Time','Action','Details','Actor'],rows.map(row=>[
   esc(row.created_at||''),esc(row.action||''),esc(row.detail||''),esc(row.actor||'—')
  ]));
  return '<section class="panel"><div class="panelhead"><h2>Cloud Audit History</h2></div><div class="panelbody">'+
   '<p>Activity recorded by the cloud modules. Times are UTC.</p>'+
   '<button type="button" class="btn secondary" id="refreshCloudAudit">Refresh Cloud History</button>'+
   (loading?'<p>Loading cloud history…</p>':error?'<p role="alert">'+esc(error)+'</p>':'')+
   (loaded?list:'')+(next!==null?'<button type="button" class="btn secondary" id="moreCloudAudit">Load Older Activity</button>':'')+
   '</div></section><h2>Browser Activity</h2>'+prior();
 };
 async function load(older=false){
  if(loading)return;
  loading=true;
  error='';
  if(page==='audit')render();
  try{
   if(!await window.BD_CLOUD_READY)throw new Error('Owner sign-in is required.');
   const response=await fetch('/api/audit-logs'+(older?'?before='+encodeURIComponent(next):''),{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw new Error(result.error||'Cloud audit history is unavailable.');
   rows=older?[...rows,...result.data]:result.data;
   next=result.next;
   loaded=true;
  }catch(err){error=err.message}
  finally{loading=false;if(page==='audit')render()}
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('#refreshCloudAudit'))void load();
  if(event.target.closest('#moreCloudAudit')&&next!==null)void load(true);
 });
 window.addEventListener('hashchange',()=>{if(location.hash==='#audit')void load()});
 if(page==='audit')void load();
})();
