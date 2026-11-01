/* Show and count Main Stock and Godown Stock separately in stock verification. */
(function(){
  function locationQty(part,location){
    if(typeof locationStock==='function')return Number(locationStock(part,location)||0);
    return location==='main'?Number(stock(part)||0):0;
  }
  function enhance(){
    if(typeof page==='undefined'||page!=='report-stock')return;
    const table=document.querySelector('#content .tablewrap table');
    if(!table||table.dataset.locationCounts==='1')return;
    const header=table.tHead?.rows[0];
    if(!header)return;
    const unitHeader=[...header.cells].find(cell=>cell.textContent.trim()==='Unit');
    if(!unitHeader)return;
    ['Main Stock','Godown Stock','Total Stock','Main Physical','Godown Physical'].forEach(label=>{
      const cell=document.createElement('th');cell.textContent=label;header.insertBefore(cell,unitHeader);
    });
    [...table.tBodies].forEach(body=>[...body.rows].forEach(row=>{
      const id=row.cells[0]?.textContent.trim();
      const line=stockReportSheet()?.lines?.find(item=>item.part===id);
      if(!line)return;
      const main=locationQty(id,'main'),godown=locationQty(id,'godown');
      const mainPhysical=line.mainPhysical===undefined?'':line.mainPhysical;
      const godownPhysical=line.godownPhysical===undefined?'':line.godownPhysical;
      const values=[main,godown,main+godown];
      values.forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.insertBefore(cell,unitHeader?row.cells[[...header.cells].indexOf(unitHeader)]:row.cells.length)});
      const insertPhysical=(value,kind)=>{
        const cell=document.createElement('td');
        if(document.querySelector('#saveStockCount')?.disabled)cell.textContent=value===''?'Not counted':value;
        else cell.innerHTML=`<input type="number" min="0" step="1" value="${value}" data-location-count="${kind}|${id}" aria-label="${kind} physical count for ${esc(line.name)}">`;
        row.insertBefore(cell,unitHeader?row.cells[[...header.cells].indexOf(unitHeader)]:row.cells.length);
      };
      insertPhysical(mainPhysical,'main');insertPhysical(godownPhysical,'godown');
    }));
    table.dataset.locationCounts='1';
  }
  document.addEventListener('input',event=>{
    const input=event.target.closest('[data-location-count]');
    if(!input||page!=='report-stock')return;
    const [kind,id]=input.dataset.locationCount.split('|');
    const line=stockReportSheet()?.lines?.find(item=>item.part===id);
    if(!line)return;
    const value=input.value===''?'':Math.max(0,Number(input.value));
    line[kind+'Physical']=value;
    const main=line.mainPhysical===''||line.mainPhysical===undefined?0:Number(line.mainPhysical);
    const godown=line.godownPhysical===''||line.godownPhysical===undefined?0:Number(line.godownPhysical);
    line.physical=main+godown;
    const total=document.querySelector(`[data-count-part="${CSS.escape(id)}"]`);
    if(total){total.value=line.physical;total.dispatchEvent(new Event('input',{bubbles:true}))}
  },true);
  const originalRender=window.render;
  if(typeof originalRender==='function')window.render=function(){const result=originalRender.apply(this,arguments);enhance();return result};
  document.addEventListener('DOMContentLoaded',enhance);setTimeout(enhance,0);
})();
