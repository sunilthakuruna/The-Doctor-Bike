'use strict';
/* One-time cleanup for the prototype-to-production handoff. Keeps the app shell,
   settings, lists and administrator account, but removes all demo transactions
   and master records used during testing. */
(function(){
  const marker=STORE+'-dummy-cleared-v1';
  if(localStorage.getItem(marker))return;
  const empty=['customers','bikes','services','staff','parts','jobs','sales','purchases','receipts','expenses','appointments','insurance','accounts','attendance','stockMovements','amcPlans','amcReminderLogs','amcRenewals','trash'];
  for(const key of empty)if(Array.isArray(db[key]))db[key]=[];
  if(db.attendance&&typeof db.attendance==='object'&&!Array.isArray(db.attendance))db.attendance={};
  db.audit=[];
  db.importInfo={source:'empty-workspace',clearedAt:new Date().toISOString()};
  localStorage.removeItem(STORE+'-restore-points-v1');
  localStorage.removeItem(STORE+'-before-demo-import');
  save('Demo records cleared; workspace is ready for real data');
  localStorage.setItem(marker,'1');
  location.reload();
})();
