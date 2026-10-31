/* Job status colours supplement, rather than replace, readable status labels. */
const jobStatusColours={'Pending':'pending','In Progress':'in-progress','Waiting for Parts':'waiting','Completed':'completed','Delivered':'delivered','Cancelled':'cancelled'};
function jobStatusColourKey(status){return jobStatusColours[status]||'other'}
function applyJobStatusColours(){if(page!=='jobs')return;for(let row of $$('#content table tbody tr')){let id=row.cells[0]?.textContent.trim(),job=find('jobs',id);if(!job)continue;row.classList.add('jobStatusRow');row.dataset.jobState=jobStatusColourKey(job.status);let headers=Array.from(row.closest('table').rows[0].cells),index=headers.findIndex(h=>h.textContent.trim().toLowerCase()==='status');if(index>=0){let badge=row.cells[index]?.querySelector('.badge');if(badge){badge.classList.add('jobStatusBadge');badge.dataset.jobState=jobStatusColourKey(job.status)}}}for(let button of $$('#content .pipeline [data-status]'))if(button.dataset.status)button.dataset.jobState=jobStatusColourKey(button.dataset.status)}
const renderBeforeJobStatusColours=render;
render=function(){renderBeforeJobStatusColours();applyJobStatusColours()};
const billBeforeJobStatusColours=billForm;
billForm=function(key,id,initial){billBeforeJobStatusColours(key,id,initial);if(key!=='jobs')return;let status=$('#billForm [name="status"]');if(!status)return;status.classList.add('jobStatusSelect');let sync=()=>status.dataset.jobState=jobStatusColourKey(status.value);status.addEventListener('change',sync);sync()};
render();
