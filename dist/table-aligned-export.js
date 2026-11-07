/* Export the displayed column layout, with all filtered pages included. */
function tableExportCell(cell){
 const values=Array.from(cell.querySelectorAll('input,select,textarea')).filter(input=>input.type!=='hidden'&&input.type!=='password'&&!input.classList.contains('localDateNative'));
 if(values.length)return values.map(input=>input.tagName==='SELECT'?(input.selectedOptions[0]?.textContent||input.value):input.type==='checkbox'?(input.checked?'Yes':'No'):input.value).join(' · ');
 const copy=cell.cloneNode(true);
 for(const node of copy.querySelectorAll('button,svg,.rowactions'))node.remove();
 return copy.textContent.replace(/\s+/g,' ').trim();
}
function tableExportRows(table){
 const header=table.tHead?.rows[0]||table.rows[0];if(!header)return [];
 const columns=Array.from(header.cells).map((cell,index)=>({cell,index,label:cell.textContent.trim()})).filter(({cell,label})=>!cell.hidden&&!cell.classList.contains('userHiddenColumn')&&!/^(actions?|password)$/i.test(label)&&label);
 const rows=[columns.map(column=>column.label)];
 for(const row of Array.from(table.rows)){
  if(row===header||row.querySelector('td.empty')||row.closest('thead'))continue;
  rows.push(columns.map(({index})=>row.cells[index]?tableExportCell(row.cells[index]):''));
 }
 return rows;
}
function alignedExportCsv(rows){
 return '\ufeff'+rows.map(row=>row.map(value=>{
  let text=String(value??'');
  if(/^[=+@\t\r]/.test(text)||/^-(?![\d₹])/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
 }).join(',')).join('\r\n');
}
(function(){
 document.addEventListener('click',event=>{
  const button=event.target.closest('button,a');if(!button||button.disabled)return;
  const label=(button.textContent||'').trim();
  if(!/export/i.test(label+' '+button.id+' '+(button.getAttribute('data-action')||'')))return;
  if(!/excel|export statement|export sheet|export report/i.test(label)&&button.getAttribute('data-action')!=='export'&&!button.hasAttribute('data-attendance-export'))return;
  const modal=button.closest('#modalBody'),scope=modal||document.querySelector('#content');
  if(!scope?.querySelector('table'))return;
  event.preventDefault();event.stopImmediatePropagation();
  const size=typeof recordPageSize==='undefined'?null:recordPageSize;
  const number=typeof recordPageNumber==='undefined'?null:recordPageNumber;
  const scroll=Array.from(scope.querySelectorAll('*')).filter(node=>node.scrollTop||node.scrollLeft).map(node=>({node,top:node.scrollTop,left:node.scrollLeft}));
  let rows=[];
  try{
   if(!modal&&size!==null){recordPageSize=0;render();}
   let tables=Array.from(scope.querySelectorAll('table')).filter(table=>!table.closest('[hidden]')&&getComputedStyle(table).display!=='none');
   const identity=button.id.toLowerCase();
   if(identity==='exportgodownhistory')tables=tables.slice(-1);
   else if(identity==='exportgodowninventory')tables=tables.slice(0,1);
   for(const table of tables){const section=tableExportRows(table);if(section.length){if(rows.length)rows.push([]);rows.push(...section)}}
  }catch(error){console.warn('Table export failed',error);toast('Could not export this table. Please try again.');return}
  finally{
   if(!modal&&size!==null){recordPageSize=size;recordPageNumber=number;render();}
   for(const item of scroll){if(item.node.isConnected){item.node.scrollTop=item.top;item.node.scrollLeft=item.left;}}
  }
  if(rows.length)download(alignedExportCsv(rows),'BIKE-DOCTOR-'+page+'-'+today()+'.csv','text/csv;charset=utf-8');
 },true);
})();
