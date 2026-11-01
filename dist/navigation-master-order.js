/* Group the master records together in the sidebar. */
(function(){
  const master=groups.find(group=>group[0]==='MASTER MANAGEMENT')?.[1];
  if(!master)return;
  const index=master.findIndex(item=>item[0]==='services');
  if(index<0)return;
  const service=master.splice(index,1)[0];
  const vehicle=master.findIndex(item=>item[0]==='bikes');
  master.splice(vehicle<0?master.length:vehicle+1,0,service);
  nav();
})();
