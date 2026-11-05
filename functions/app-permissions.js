// Unknown routes and combined snapshots fail closed until their collection-level
// authorization is implemented. Never grant access from a browser-supplied role.
const modules={customers:'customers',vehicles:'bikes',services:'services',staff:'staff',attendance:'attendance',accounts:'accounts',expenses:'expenses',insurance:'insurance',amc:'amc-plans','amc-renewals':'amc-plans','amc-assignments':'amc-plans','service-reminders':'service-reminders',lists:'lists','business-settings':'settings','stock-counts':'report-stock','audit-logs':'audit'};
const labels={customers:'Customer Master',bikes:'Vehicle Master',services:'Service Master',staff:'Staff Master',attendance:'Staff Attendance',accounts:'Account Master',expenses:'Expenses',insurance:'Insurance','amc-plans':'AMC Management / Reminder','service-reminders':'Vehicle Service Reminders',lists:'List Management',settings:'Business Setting','report-stock':'Reports',audit:'Audit Logs'};
const records={customers:'Customer',bikes:'Vehicle',services:'Service',staff:'Staff',accounts:'Account',expenses:'Expense'};
export function permitted(user,pathname,method){
 if(!user||user.status!=='Active')return false;
 if(user.role==='Admin')return true;
 const route=pathname.split('/').filter(Boolean).at(-1),module=modules[route];
 if(!module)return false;
 let permissions,restrictions;
 try{permissions=JSON.parse(user.permissions);restrictions=JSON.parse(user.action_restrictions)}catch{return false}
 const action=['GET','HEAD'].includes(method)?'read':method==='POST'?'write':method==='DELETE'?'delete':'edit';
 if(permissions?.[module]?.read!==true||permissions?.[module]?.[action]!==true)return false;
 const blocked=restrictions?.[labels[module]]||{};
 if(records[module]){
  const verb={write:'Add',edit:'Edit',delete:'Delete'}[action];
  if(verb&&blocked[verb+' '+records[module]]===true)return false;
 }else if(action!=='read'&&Object.values(blocked).some(Boolean)){
  // Combined endpoints still require granular validation before granting writes.
  return false;
 }
 return true;
}
