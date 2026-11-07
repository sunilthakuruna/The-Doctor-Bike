/* Refresh visible lists from D1 without reloading the page or replacing open forms. */
(() => {
 const pages={customers:['customers'],bikes:['vehicles','customers'],services:['services'],staff:['staff'],accounts:['accounts'],expenses:['expenses','accounts','staff'],attendance:['staff'],payroll:['staff','expenses'],jobs:['customers','vehicles','services','staff','accounts'],sales:['customers','accounts'],payments:['customers','accounts'],purchases:['accounts'],insurance:['customers','vehicles'],dashboard:['customers','vehicles','services','staff','accounts','expenses']};
 const keys={customers:'customers',vehicles:'bikes',services:'services',staff:'staff',accounts:'accounts',expenses:'expenses'};
 const stable=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
 for(const [route,key]of Object.entries(keys))cloudRecordRefreshers.push(async()=>{
  const visible=page.startsWith('report-')||page==='reports'||(pages[page]||[]).includes(route);
  if(!visible||window.BD_OFFLINE_SESSION||navigator.onLine===false||!canRefreshCloudRecords())return false;
  if(typeof window.BD_HAS_MODULE_ACCESS==='function'&&!window.BD_HAS_MODULE_ACCESS(key))return false;
  const before=stable(db[key]),currentPage=page;
  const response=await fetch('/api/'+route,{cache:'no-store'});
  if(!response.ok||response.headers.get('x-bike-offline')==='1')return false;
  const result=await response.json();
  if(!Array.isArray(result.data)||page!==currentPage||!canRefreshCloudRecords()||stable(db[key])!==before)return false;
  const records=route==='customers'?result.data.map(row=>({...row,alt:row.alt_mobile||''})):result.data;
  if(stable(records)===before)return false;
  db[key]=records;return true;
 });
 document.addEventListener('focusout',()=>{setTimeout(()=>{if(canRefreshCloudRecords())scheduleCloudRefresh(0)},0)});
})();
