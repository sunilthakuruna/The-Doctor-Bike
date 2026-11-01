/* Select supporting files from the device temporarily. Nothing is written into the record or browser storage. */
function ensureRecordDocuments(key,id,form){if(!attachmentModules.includes(key)||!form||form.querySelector('.attachmentPanel'))return;let body=form.querySelector('.formbody');if(!body)return;if(id&&find(key,id)){body.insertAdjacentHTML('beforeend',attachmentPanel(key,id));return}body.insertAdjacentHTML('beforeend','<div class="notice">Save this record first, then select device files from its Documents &amp; Images action. Selected files stay temporary and are not saved with the record.</div>')}
const editBeforeTemporaryDocumentCoverage=editRecord;
editRecord=function(key,id,initial){editBeforeTemporaryDocumentCoverage(key,id,initial);if(!['jobs','sales','purchases'].includes(key))ensureRecordDocuments(key,id,$('#recordForm'))};
const billBeforeTemporaryDocumentCoverage=billForm;
billForm=function(key,id,initial){billBeforeTemporaryDocumentCoverage(key,id,initial);ensureRecordDocuments(key,id,$('#billForm'))};
const godownFormBeforeTemporaryDocuments=openGodownOpeningForm;
openGodownOpeningForm=function(partId){godownFormBeforeTemporaryDocuments(partId);ensureRecordDocuments('parts',partId,$('#godownOpeningForm'))};
// Godown row actions are bound by godown-stock.js; there is no openGodownActions hook.
render();

