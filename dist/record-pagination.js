/* Table row count selector and paging for record lists and reports. */
let recordPageSize=10,recordPageNumber=1,lastPaginatedView=page;
const tableBeforeRecordPagination=table;
const paginatedViews=new Set(['customers','bikes','insurance','staff','attendance','payroll','services','accounts','jobs','parts','godown','sales','purchases','payments','expenses','appointments','audit']);
function shouldPaginateRecords(){return paginatedViews.has(page)||String(page).startsWith('report-')}
table=function(headers,rows){
 if(!shouldPaginateRecords())return tableBeforeRecordPagination(headers,rows);
 let count=rows.length,size=recordPageSize||Math.max(count,1),pages=Math.max(1,Math.ceil(count/size));recordPageNumber=Math.min(Math.max(recordPageNumber,1),pages);
 let first=count?((recordPageNumber-1)*size)+1:0,last=Math.min(recordPageNumber*size,count),shown=rows.slice((recordPageNumber-1)*size,recordPageNumber*size);
 let html=tableBeforeRecordPagination(headers,shown);
 return html+`<div class="record-pagination"><label>Rows <select id="recordPageSize" aria-label="Rows per page"><option value="10" ${recordPageSize===10?'selected':''}>10</option><option value="25" ${recordPageSize===25?'selected':''}>25</option><option value="50" ${recordPageSize===50?'selected':''}>50</option><option value="100" ${recordPageSize===100?'selected':''}>100</option><option value="all" ${recordPageSize===0?'selected':''}>All</option></select></label><span class="record-page-count">${first}–${last} / ${count}</span><div class="record-page-buttons"><button type="button" class="btn secondary small" id="recordPagePrevious" ${recordPageNumber<=1?'disabled':''} aria-label="Previous page">‹ Prev</button><span>${recordPageNumber} / ${pages}</span><button type="button" class="btn secondary small" id="recordPageNext" ${recordPageNumber>=pages?'disabled':''} aria-label="Next page">Next ›</button></div></div>`
};
const renderBeforeRecordPagination=render;
render=function(){if(page!==lastPaginatedView){recordPageNumber=1;lastPaginatedView=page}renderBeforeRecordPagination();if(!shouldPaginateRecords())return;let size=$('#recordPageSize');if(size)size.onchange=e=>{recordPageSize=e.target.value==='all'?0:Number(e.target.value);recordPageNumber=1;render()};let previous=$('#recordPagePrevious'),next=$('#recordPageNext');if(previous)previous.onclick=()=>{recordPageNumber=Math.max(1,recordPageNumber-1);render()};if(next)next.onclick=()=>{recordPageNumber++;render()};let searchBox=$('#search');if(searchBox&&!searchBox.dataset.paginationBound){let handler=searchBox.oninput;searchBox.oninput=function(e){recordPageNumber=1;return handler?.call(this,e)};searchBox.dataset.paginationBound='1'}for(let id of ['#filter','#stockFilter','#reportFrom','#reportTo']){let control=$(id);if(control&&!control.dataset.paginationBound){let handler=control.onchange;control.onchange=function(e){recordPageNumber=1;return handler?.call(this,e)};control.dataset.paginationBound='1'}}};
render();

