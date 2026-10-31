'use strict';
function isLastActiveAdmin(id){let user=find('users',id);return !!user&&user.role==='Admin'&&user.status!=='Inactive'&&db.users.filter(u=>u.role==='Admin'&&u.status!=='Inactive').length<=1}
const deleteRecordBeforeAdminGuard=deleteRecord;
deleteRecord=function(key,id){if(key==='users'&&isLastActiveAdmin(id))return toast('The last active Admin cannot be deleted. Add another active Admin first.');return deleteRecordBeforeAdminGuard(key,id)};
const actionsBeforeAdminGuard=actions;
actions=function(key,id,extra=''){let html=actionsBeforeAdminGuard(key,id,extra);if(key!=='users'||!isLastActiveAdmin(id))return html;return html.replace(`data-delete="users|${esc(id)}"`,`data-delete="users|${esc(id)}" disabled aria-disabled="true" title="Add another active Admin before deleting this account"`)};
render();
