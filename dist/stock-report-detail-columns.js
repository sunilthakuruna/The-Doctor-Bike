/* Expand stock verification part details after Part Name. */
(function(){
  function enhance(){
    if(typeof page==='undefined'||page!=='report-stock')return;
    const table=document.querySelector('#content .tablewrap table');
    if(!table||table.dataset.stockDetailColumns==='1')return;
    const header=table.tHead?.rows[0];
    if(!header)return;
    const makeHeader=[...header.cells].find(cell=>cell.textContent.trim()==='Vehicle Make / Model');
    const rackHeader=[...header.cells].find(cell=>cell.textContent.trim()==='Rack');
    if(!makeHeader||!rackHeader)return;
    makeHeader.textContent='Vehicle Make';
    ['Vehicle Model','Brand Name','Part Type'].forEach(label=>{
      const cell=document.createElement('th');cell.textContent=label;header.insertBefore(cell,rackHeader);
    });
    [...table.tBodies].forEach(body=>[...body.rows].forEach(row=>{
      const part=find('parts',row.cells[0]?.textContent.trim());
      if(!part)return;
      row.cells[2].textContent=part.vehicleMake||part.make||'—';
      const rackCell=row.cells[3];
      [part.vehicleModel||part.model||'—',part.brand||'—',part.partType||part.type||'—'].forEach(value=>{
        const cell=document.createElement('td');cell.textContent=value;row.insertBefore(cell,rackCell);
      });
    }));
    table.dataset.stockDetailColumns='1';
  }
  const originalRender=window.render;
  if(typeof originalRender==='function')window.render=function(){const result=originalRender.apply(this,arguments);enhance();return result};
  document.addEventListener('DOMContentLoaded',enhance);
  setTimeout(enhance,0);
})();
