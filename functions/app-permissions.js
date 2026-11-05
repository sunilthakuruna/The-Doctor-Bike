// Unknown routes and combined snapshots fail closed until their collection-level
// authorization is implemented. Never grant access from a browser-supplied role.
const modules={customers:'customers',vehicles:'bikes',services:'services',staff:'staff',attendance:'attendance',accounts:'accounts',expenses:'expenses',insurance:'insurance',amc:'amc-plans','amc-renewals':'amc-plans','amc-assignments':'amc-plans','service-reminders':'service-reminders',lists:'lists','business-settings':'settings','stock-counts':'report-stock','audit-logs':'audit'};
export function permitted(user,pathname,method){
 if(!user||user.status!=='Active')return false;
 if(user.role==='Admin')return true;
 const route=pathname.split('/').filter(Boolean).at(-1),module=modules[route];
 if(!module)return false;
 let permissions,restrictions;
 try{permissions=JSON.parse(user.permissions);restrictions=JSON.parse(user.action_restrictions)}catch{return false}
 const action=['GET','HEAD'].includes(method)?'read':method==='POST'?'write':method==='DELETE'?'delete':'edit';
 if(permissions?.[module]?.read!==true||permissions?.[module]?.[action]!==true)return false;
 // Fine-grained action restrictions require endpoint-specific validation.
 // Deny mutations with any restriction rather than accidentally bypassing one.
 if(action!=='read'&&Object.values(restrictions||{}).some(values=>Object.values(values||{}).some(Boolean)))return false;
 return true;
}
